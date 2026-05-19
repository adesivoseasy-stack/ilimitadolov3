import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json; charset=utf-8',
};

interface SessionRequest {
  license_key: string;
  hwid: string;
  device_name?: string;
  ip_address?: string; // Required for wildcard licenses
}

interface SessionResponse {
  status: 'success' | 'expired' | 'revoked' | 'device_mismatch' | 'not_found' | 'error' | 'limit_reached';
  message: string;
  session_token?: string;
  expires_in?: number; // seconds
  days_remaining?: number;
  messages_remaining?: number; // For wildcard licenses
}

const SESSION_DURATION_HOURS = 1; // Session expires in 1 hour
const WILDCARD_MESSAGE_LIMIT = 10; // Max messages per IP for wildcard licenses

// Helper function to extract client IP from request headers
function getClientIP(req: Request): string {
  // Priority: x-forwarded-for > x-real-ip > cf-connecting-ip
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, the first is the original client
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 
         req.headers.get('cf-connecting-ip') || 
         'unknown';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { license_key, hwid, device_name, ip_address } = await req.json() as SessionRequest;

    console.log(`Creating session for license: ${license_key?.substring(0, 5)}***, HWID: ${hwid?.substring(0, 10)}***`);

    if (!license_key || !hwid) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Missing license_key or hwid',
      } as SessionResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean expired sessions first
    await supabase.rpc('clean_expired_sessions');

    // Find the license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .maybeSingle();

    if (licenseError || !license) {
      console.log('License not found');
      return new Response(JSON.stringify({
        status: 'not_found',
        message: 'License not found',
      } as SessionResponse), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if license is revoked
    if (license.status === 'revoked') {
      console.log('License is revoked');
      return new Response(JSON.stringify({
        status: 'revoked',
        message: 'License has been revoked',
      } as SessionResponse), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle wildcard licenses (IP-based limiting, no device binding)
    if (license.is_wildcard) {
      // Auto-capture IP from request headers (ignores any ip_address in body)
      const clientIP = getClientIP(req);
      console.log(`Processing wildcard license, captured IP: ${clientIP}`);
      
      if (clientIP === 'unknown') {
        console.log('Warning: Could not determine client IP');
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Could not determine client IP address',
        } as SessionResponse), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check/update IP usage
      const { data: existingUsage } = await supabase
        .from('wildcard_usage')
        .select('*')
        .eq('license_id', license.id)
        .eq('ip_address', clientIP)
        .maybeSingle();

      if (existingUsage) {
        if (existingUsage.message_count >= WILDCARD_MESSAGE_LIMIT) {
          console.log(`IP ${clientIP} reached message limit`);
          return new Response(JSON.stringify({
            status: 'limit_reached',
            message: `Limite de ${WILDCARD_MESSAGE_LIMIT} mensagens atingido para este IP`,
            messages_remaining: 0,
          } as SessionResponse), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update last_used_at but DON'T increment counter here
        // Counter is incremented in send-message for each actual message
        await supabase
          .from('wildcard_usage')
          .update({ 
            last_used_at: new Date().toISOString()
          })
          .eq('id', existingUsage.id);

        const messagesRemaining = WILDCARD_MESSAGE_LIMIT - existingUsage.message_count;
        console.log(`Wildcard session validated, ${messagesRemaining} messages remaining`);

        // Generate session token and STORE it in sessions table
        const { data: tokenResult } = await supabase.rpc('generate_session_token');
        const sessionToken = tokenResult as string;
        const sessionExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
        
        // Store session so send-message can validate it
        await supabase.from('sessions').insert({
          license_id: license.id,
          hwid: `wildcard_${clientIP}`,
          session_token: sessionToken,
          expires_at: sessionExpires.toISOString(),
        });
        
        return new Response(JSON.stringify({
          status: 'success',
          message: 'Wildcard session validated',
          session_token: sessionToken,
          expires_in: 300, // 5 min for wildcard
          messages_remaining: messagesRemaining,
        } as SessionResponse), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // First use from this IP - set count to 0 (will be incremented in send-message)
        await supabase
          .from('wildcard_usage')
          .insert({
            license_id: license.id,
            ip_address: clientIP,
            message_count: 0,
          });

        await supabase.from('license_logs').insert({
          license_id: license.id,
          action: 'wildcard_new_ip',
          details: { ip_address: clientIP },
        });

        const { data: tokenResult } = await supabase.rpc('generate_session_token');
        const sessionToken = tokenResult as string;
        const sessionExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
        
        // Store session so send-message can validate it
        await supabase.from('sessions').insert({
          license_id: license.id,
          hwid: `wildcard_${clientIP}`,
          session_token: sessionToken,
          expires_at: sessionExpires.toISOString(),
        });
        
        console.log(`New wildcard IP registered, ${WILDCARD_MESSAGE_LIMIT} messages available`);
        return new Response(JSON.stringify({
          status: 'success',
          message: 'Wildcard session created',
          session_token: sessionToken,
          expires_in: 300,
          messages_remaining: WILDCARD_MESSAGE_LIMIT,
        } as SessionResponse), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if this is a test license that needs activation
    const isTestLicense = license.duration_hours && !license.first_activated_at;
    let expiresAt = new Date(license.expires_at);
    let daysRemaining: number;
    const now = new Date();

    if (isTestLicense) {
      // First activation of a test license - set the real expiration
      console.log(`First activation of test license, duration: ${license.duration_hours} hours`);
      const durationMs = license.duration_hours * 60 * 60 * 1000;
      expiresAt = new Date(now.getTime() + durationMs);
      
      // Update the license with real expiration
      const { error: updateError } = await supabase
        .from('licenses')
        .update({
          expires_at: expiresAt.toISOString(),
          first_activated_at: now.toISOString(),
        })
        .eq('id', license.id);

      if (updateError) {
        console.error('Failed to update license activation:', updateError);
      }

      // Log the activation
      await supabase.from('license_logs').insert({
        license_id: license.id,
        action: 'test_license_activated',
        details: { duration_hours: license.duration_hours, expires_at: expiresAt.toISOString() },
      });

      daysRemaining = Math.ceil(license.duration_hours / 24);
    } else {
      daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (daysRemaining < 0 || license.status === 'expired') {
      if (license.status !== 'expired') {
        await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
      }
      console.log('License has expired');
      return new Response(JSON.stringify({
        status: 'expired',
        message: 'License has expired',
        days_remaining: 0,
      } as SessionResponse), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check device binding
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('*')
      .eq('license_id', license.id)
      .maybeSingle();

    if (existingDevice && existingDevice.hwid !== hwid) {
      // Check if there's an ACTIVE (not expired) session - this is the real check
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id, expires_at, last_activity')
        .eq('license_id', license.id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (activeSession) {
        // There's an active non-expired session, check if it's been used recently (last 30 min)
        const lastActivity = new Date(activeSession.last_activity).getTime();
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        
        if (lastActivity > thirtyMinutesAgo) {
          // Active session with recent activity - real device mismatch
          console.log('Device mismatch - active session with recent activity on another device');
          return new Response(JSON.stringify({
            status: 'device_mismatch',
            message: 'License is already activated on another device',
          } as SessionResponse), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Session exists but no recent activity - allow re-bind (user likely lost HWID storage)
        console.log('Allowing re-bind: session exists but no recent activity (>30min)');
      }
      
      // Either no active session or no recent activity - auto-reset device
      console.log('Auto-resetting device binding');
      await supabase.from('devices').delete().eq('id', existingDevice.id);
      await supabase.from('sessions').delete().eq('license_id', license.id);
      await supabase.from('license_logs').insert({
        license_id: license.id,
        action: 'device_auto_reset',
        details: { old_hwid: existingDevice.hwid, new_hwid: hwid, reason: 'session_expired_or_inactive' },
      });
    }

    // Register device if new
    if (!existingDevice) {
      console.log('Registering new device');
      await supabase.from('devices').insert({
        license_id: license.id,
        hwid,
        device_name: device_name || null,
      });
      await supabase.from('license_logs').insert({
        license_id: license.id,
        action: 'device_activated',
        details: { hwid, device_name },
      });
    } else {
      // Update last seen
      await supabase.from('devices').update({ last_seen_at: new Date().toISOString() }).eq('id', existingDevice.id);
    }

    // Invalidate any existing sessions for this license/hwid
    await supabase.from('sessions').delete().eq('license_id', license.id).eq('hwid', hwid);

    // Generate secure session token
    const { data: tokenResult } = await supabase.rpc('generate_session_token');
    const sessionToken = tokenResult as string;
    
    // Create new session
    const sessionExpires = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
    
    const { error: sessionError } = await supabase.from('sessions').insert({
      license_id: license.id,
      hwid,
      session_token: sessionToken,
      expires_at: sessionExpires.toISOString(),
    });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Failed to create session',
      } as SessionResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log session creation
    await supabase.from('license_logs').insert({
      license_id: license.id,
      action: 'session_created',
      details: { hwid, expires_at: sessionExpires.toISOString() },
    });

    console.log('Session created successfully');
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Session created',
      session_token: sessionToken,
      expires_in: SESSION_DURATION_HOURS * 60 * 60, // in seconds
      days_remaining: daysRemaining,
    } as SessionResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Internal server error',
    } as SessionResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
