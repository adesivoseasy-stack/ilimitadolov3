import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

interface DeviceInfo {
  screen?: string;
  color_depth?: number;
  timezone?: string;
  language?: string;
  platform?: string;
  cores?: number;
}

interface ValidateRequest {
  license_key: string;
  device_name?: string;
  device_info?: DeviceInfo;
  // HWID encaminhado por relays confiáveis (ex.: n8n).
  // Quando presente, é usado como fonte de verdade para evitar
  // que o HWID seja gerado a partir do User-Agent do servidor relay.
  hwid?: string;
  device_id?: string;
  forwarded_hwid?: string;
}

interface ValidateResponse {
  status: 'valid' | 'expired' | 'revoked' | 'device_mismatch' | 'not_found' | 'error';
  message: string;
  days_remaining?: number;
  hours_remaining?: number;
  license_id?: string;
  session_token?: string;
}

// Generate server-side HWID combining User-Agent + stable device info
// All fields are stable across reboots/IP changes
async function generateServerHWID(userAgent: string, deviceInfo?: DeviceInfo): Promise<string> {
  const parts = [userAgent];
  if (deviceInfo) {
    if (deviceInfo.screen) parts.push(deviceInfo.screen);
    if (deviceInfo.color_depth) parts.push(String(deviceInfo.color_depth));
    if (deviceInfo.timezone) parts.push(deviceInfo.timezone);
    if (deviceInfo.language) parts.push(deviceInfo.language);
    if (deviceInfo.platform) parts.push(deviceInfo.platform);
    if (deviceInfo.cores) parts.push(String(deviceInfo.cores));
  }
  const fingerprint = parts.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
  return 'SRV2-' + hashHex.toUpperCase();
}

// Generate cryptographically secure session token
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract client IP and User-Agent for server-side HWID
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const body = await req.json() as ValidateRequest;
    const { license_key, device_name, device_info } = body;

    // HWID precedence:
    // 1. Header `x-forwarded-hwid` (set by trusted relay like n8n)
    // 2. Body `forwarded_hwid` / `hwid` / `device_id` (also from relay)
    // 3. Server-side derived from User-Agent + device_info (default for direct extension calls)
    const forwardedHwidHeader = req.headers.get('x-forwarded-hwid')?.trim();
    const forwardedHwidBody = (body.forwarded_hwid || body.hwid || body.device_id || '').trim();
    const forwardedHwid = forwardedHwidHeader || forwardedHwidBody;

    let hwid: string;
    let hwidSource: string;
    if (forwardedHwid && forwardedHwid.length >= 8) {
      hwid = forwardedHwid;
      hwidSource = forwardedHwidHeader ? 'header' : 'body';
    } else {
      hwid = await generateServerHWID(userAgent, device_info);
      hwidSource = 'server-derived';
    }

    console.log(`[validate-license-v2] Validating: ${license_key?.substring(0, 8)}***, HWID: ${hwid} (${hwidSource}), IP: ${clientIP}`);

    if (!license_key) {
      const response: ValidateResponse = {
        status: 'error',
        message: 'Missing license_key',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect test license by TESTE- prefix
    const isTestLicense = license_key.startsWith('TESTE-');

    // Find the license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .maybeSingle();

    if (licenseError) {
      console.error('[validate-license-v2] Database error:', licenseError);
      const response: ValidateResponse = {
        status: 'error',
        message: 'Database error',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!license) {
      console.log('[validate-license-v2] License not found');
      const response: ValidateResponse = {
        status: 'not_found',
        message: 'License not found',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if license is revoked
    if (license.status === 'revoked') {
      console.log('[validate-license-v2] License is revoked');
      const response: ValidateResponse = {
        status: 'revoked',
        message: 'License has been revoked',
        license_id: license.id,
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // IP-based auto-revocation removido a pedido: IP dinâmico causava falsos positivos.
    // A defesa anti-revenda agora é exclusivamente por unique project_id (>2 projetos/min)
    // implementada em send-message via register_license_project.

    // Handle test licenses with delayed activation (duration_hours set, first_activated_at null)
    let expiresAt = new Date(license.expires_at);
    const now = new Date();

    const isTestLike = !!license.duration_hours && license.duration_hours <= 0.5;

    if (license.duration_hours && !license.first_activated_at) {
      // 1ª ativação — test licenses respeitam cap de 10min; pagas usam duration_hours integral (ex.: 720h = 30d)
      let effectiveDuration = license.duration_hours;
      if (isTestLike) {
        const MAX_TEST_MINUTES = 10;
        const maxDurationHours = MAX_TEST_MINUTES / 60;
        effectiveDuration = Math.min(license.duration_hours, maxDurationHours);
      }
      const durationMs = effectiveDuration * 60 * 60 * 1000;
      expiresAt = new Date(now.getTime() + durationMs);

      console.log(`[validate-license-v2] Primeira ativação. Duration: ${effectiveDuration}h, Expires: ${expiresAt.toISOString()}`);

      await supabase
        .from('licenses')
        .update({
          first_activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          duration_hours: effectiveDuration,
        })
        .eq('id', license.id);

      await supabase.from('license_logs').insert({
        license_id: license.id,
        action: isTestLike ? 'test_license_activated' : 'license_activated',
        details: {
          duration_hours: effectiveDuration,
          expires_at: expiresAt.toISOString(),
          hwid,
          ip: clientIP,
        },
      });
    } else if (license.duration_hours && license.first_activated_at && isTestLike) {
      // Test license já ativada — força cap de 10min desde a 1ª ativação
      const MAX_TEST_MINUTES = 10;
      const maxExpiry = new Date(new Date(license.first_activated_at).getTime() + MAX_TEST_MINUTES * 60 * 1000);
      if (expiresAt > maxExpiry) {
        expiresAt = maxExpiry;
        await supabase.from('licenses').update({ expires_at: maxExpiry.toISOString() }).eq('id', license.id);
        console.log(`[validate-license-v2] Test license expiry capped to ${maxExpiry.toISOString()}`);
      }
    }

    // For wildcard licenses, skip expiration check entirely (no limit, no expiry)
    if (license.is_wildcard) {
      console.log(`[validate-license-v2] Wildcard license - no expiration, IP based tracking for ${clientIP}`);
      const daysRemaining = 99999;
      const hoursRemaining = 99999 * 24;
      console.log(`[validate-license-v2] Wildcard license - IP based tracking for ${clientIP}`);
      
      // Check/create wildcard usage record for this IP
      const { data: existingUsage } = await supabase
        .from('wildcard_usage')
        .select('*')
        .eq('license_id', license.id)
        .eq('ip_address', clientIP)
        .maybeSingle();

      if (!existingUsage) {
        // Register new IP usage
        await supabase.from('wildcard_usage').insert({
          license_id: license.id,
          ip_address: clientIP,
          message_count: 0,
        });
        console.log(`[validate-license-v2] New wildcard usage registered for IP ${clientIP}`);
      }

      // Create session with wildcard HWID format
      const sessionToken = generateSessionToken();
      const sessionExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours for wildcards (no limit)

      // Clean old sessions for this wildcard IP
      await supabase.from('sessions')
        .delete()
        .eq('license_id', license.id)
        .eq('hwid', `wildcard_${clientIP}`);

      // Create new session
      await supabase.from('sessions').insert({
        license_id: license.id,
        session_token: sessionToken,
        hwid: `wildcard_${clientIP}`,
        expires_at: sessionExpires.toISOString(),
      });

      const response: ValidateResponse = {
        status: 'valid',
        message: 'Wildcard license is valid',
        days_remaining: daysRemaining,
        hours_remaining: hoursRemaining,
        license_id: license.id,
        session_token: sessionToken,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (expiresAt <= now || license.status === 'expired') {
      if (license.status !== 'expired') {
        await supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('id', license.id);
      }

      // Auto-delete test licenses (TESTE- prefix or short duration) on expiration
      const shouldAutoDelete = isTestLicense || (license.duration_hours !== null && license.duration_hours <= 0.17);
      if (shouldAutoDelete) {
        console.log(`[validate-license-v2] Auto-deleting expired test license: ${license_key}`);
        // Delete related records first, then the license
        await Promise.all([
          supabase.from('license_logs').delete().eq('license_id', license.id),
          supabase.from('sessions').delete().eq('license_id', license.id),
          supabase.from('devices').delete().eq('license_id', license.id),
        ]);
        await supabase.from('licenses').delete().eq('id', license.id);
      }

      // Check if this license was renewed (has a new key)
      const isRenewed = license.notes?.includes('[Renovada');
      if (isRenewed) {
        console.log('[validate-license-v2] License was renewed, old key used');
        const response: ValidateResponse = {
          status: 'expired',
          message: 'Esta licença foi renovada. Uma nova chave foi gerada. Consulte seu revendedor.',
          days_remaining: 0,
          license_id: license.id,
        };
        return new Response(JSON.stringify(response), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[validate-license-v2] License has expired');
      const response: ValidateResponse = {
        status: 'expired',
        message: isTestLicense ? 'Test license has expired and was removed' : 'License has expired',
        days_remaining: 0,
        license_id: license.id,
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular license: Check device binding
    const { data: existingDevice, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('license_id', license.id)
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (deviceError) {
      console.error('[validate-license-v2] Device lookup error:', deviceError);
      const response: ValidateResponse = {
        status: 'error',
        message: 'Database error',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingDevice) {
      // Device already registered, check if it matches
      if (existingDevice.hwid !== hwid) {
        console.log(`[validate-license-v2] Device mismatch: stored ${existingDevice.hwid}, current ${hwid}`);
        const response: ValidateResponse = {
          status: 'device_mismatch',
          message: 'License is already activated on another device',
          license_id: license.id,
        };
        return new Response(JSON.stringify(response), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update last seen
      await supabase
        .from('devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existingDevice.id);
    } else {
      // Register new device
      console.log(`[validate-license-v2] Registering new device with server-side HWID: ${hwid}`);
      const { error: insertError } = await supabase
        .from('devices')
        .insert({
          license_id: license.id,
          hwid,
          device_name: device_name || `${userAgent.substring(0, 50)}...`,
        });

      if (insertError) {
        console.error('[validate-license-v2] Device registration error:', insertError);
        const response: ValidateResponse = {
          status: 'error',
          message: 'Failed to register device',
        };
        return new Response(JSON.stringify(response), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the activation
      await supabase.from('license_logs').insert({
        license_id: license.id,
        action: 'device_activated',
        details: { hwid, ip: clientIP, device_name },
      });
    }

    // Create session token for authenticated requests
    const sessionToken = generateSessionToken();
    const sessionExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Clean old sessions for this device
    await supabase.from('sessions')
      .delete()
      .eq('license_id', license.id)
      .eq('hwid', hwid);

    // Create new session
    await supabase.from('sessions').insert({
      license_id: license.id,
      session_token: sessionToken,
      hwid: hwid,
      expires_at: sessionExpires.toISOString(),
    });

    console.log(`[validate-license-v2] License valid, session created: ${sessionToken.substring(0, 8)}***`);

    const response: ValidateResponse = {
      status: 'valid',
      message: 'License is valid',
      days_remaining: daysRemaining,
      hours_remaining: hoursRemaining,
      license_id: license.id,
      session_token: sessionToken,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[validate-license-v2] Unexpected error:', error);
    const response: ValidateResponse = {
      status: 'error',
      message: 'Internal server error',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
