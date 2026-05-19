import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid session' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { recaptchaToken } = body;

    if (!recaptchaToken || typeof recaptchaToken !== 'string') {
      return new Response(JSON.stringify({ success: false, message: 'reCAPTCHA token is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return new Response(JSON.stringify({ success: false, message: 'reCAPTCHA not configured on server' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Verify with Google
    const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(recaptchaToken)}`,
    });

    const verifyData = await verifyResponse.json();
    console.log('reCAPTCHA verify result:', JSON.stringify(verifyData));

    if (!verifyData.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'reCAPTCHA verification failed. Please try again.',
      }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'reCAPTCHA verified' }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Unexpected error:', (error as Error).message);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
