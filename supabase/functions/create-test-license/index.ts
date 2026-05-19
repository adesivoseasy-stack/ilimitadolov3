import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip, cf-connecting-ip',
  'Content-Type': 'application/json; charset=utf-8',
};

interface CreateTestRequest {
  email: string;
}

interface CreateTestResponse {
  success: boolean;
  license_key?: string;
  expires_in_minutes?: number;
  message: string;
}

// Get client IP from headers
function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

// Strict email validation matching RFC 5321
function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIP = getClientIP(req);
    console.log(`Create test license request from IP: ${clientIP}`);

    const body = await req.json() as CreateTestRequest;
    const { email } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      const response: CreateTestResponse = {
        success: false,
        message: 'Invalid email address',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if requester is an admin (by checking auth header)
    let isAdmin = false;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .limit(1);
        isAdmin = !!(adminRole && adminRole.length > 0);
      }
    }

    // If not admin, check for active license
    if (!isAdmin) {
      const { data: activeLicenses } = await supabase
        .from('licenses')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('status', 'active')
        .is('duration_hours', null)
        .limit(1);

      const { data: paidDurationLicenses } = await supabase
        .from('licenses')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('status', 'active')
        .gt('duration_hours', 0.17)
        .limit(1);

      const hasActiveKey = (activeLicenses && activeLicenses.length > 0) || 
                            (paidDurationLicenses && paidDurationLicenses.length > 0);

      if (!hasActiveKey) {
        const response: CreateTestResponse = {
          success: false,
          message: 'Test licenses are only available for admins or users with an active license.',
        };
        return new Response(JSON.stringify(response), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Access granted - isAdmin: ${isAdmin}, email: ${email}`);

    // Rate limiting: Check if this IP already created a test license in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentLicenses, error: checkError } = await supabase
      .from('licenses')
      .select('id, created_at')
      .lte('duration_hours', 0.5) // test license identifier (<=30min)
      .gte('created_at', twentyFourHoursAgo)
      .ilike('notes', `%IP: ${clientIP}%`)
      .limit(1);

    if (checkError) {
      console.error('Rate limit check error:', checkError);
    }

    if (recentLicenses && recentLicenses.length > 0) {
      const response: CreateTestResponse = {
        success: false,
        message: 'You already created a test license recently. Please wait 24 hours.',
      };
      return new Response(JSON.stringify(response), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also check by email - limit 1 test license per email per 24 hours
    const { data: emailLicenses, error: emailCheckError } = await supabase
      .from('licenses')
      .select('id, created_at')
      .eq('email', email.toLowerCase())
      .lte('duration_hours', 0.5)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1);

    if (emailCheckError) {
      console.error('Email rate limit check error:', emailCheckError);
    }

    if (emailLicenses && emailLicenses.length > 0) {
      const response: CreateTestResponse = {
        success: false,
        message: 'This email already has a test license. Please wait 24 hours.',
      };
      return new Response(JSON.stringify(response), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate license key
    const { data: keyData, error: keyError } = await supabase.rpc('generate_license_key');
    
    if (keyError || !keyData) {
      console.error('License key generation error:', keyError);
      const response: CreateTestResponse = {
        success: false,
        message: 'Failed to generate license',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prefix test keys with TESTE-
    const rawKey = keyData as string;
    const licenseKey = `TESTE-${rawKey}`;
    const durationMinutes = 10;
    const durationHours = durationMinutes / 60; // ~0.1667
    
    // For test licenses, set a short fallback expiration (1 hour from now)
    // Will be recalculated to exactly 10 min on first activation
    const fallbackExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Create the test license
    const { data: newLicense, error: insertError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        email: email.toLowerCase(),
        expires_at: fallbackExpiry,
        duration_hours: durationHours,
        first_activated_at: null, // Will be set on first validation
        status: 'active',
        notes: `Test license created via API | IP: ${clientIP}`,
        price: 0,
        is_wildcard: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('License creation error:', insertError);
      const response: CreateTestResponse = {
        success: false,
        message: 'Failed to create license',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the creation
    await supabase.from('license_logs').insert({
      license_id: newLicense.id,
      action: 'test_license_created_api',
      details: { 
        ip: clientIP, 
        email: email.toLowerCase(),
        duration_minutes: durationMinutes 
      },
    });

    console.log(`Test license created: ${licenseKey} for ${email}`);

    const response: CreateTestResponse = {
      success: true,
      license_key: licenseKey,
      expires_in_minutes: durationMinutes,
      message: `Test license created! Valid for ${durationMinutes} minutes after first use.`,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    const response: CreateTestResponse = {
      success: false,
      message: 'Internal server error',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
