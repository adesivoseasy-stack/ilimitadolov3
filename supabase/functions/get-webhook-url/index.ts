import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_token, hwid } = await req.json()

    if (!session_token || !hwid) {
      console.log('Missing session_token or hwid')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, license_id, expires_at')
      .eq('session_token', session_token)
      .eq('hwid', hwid)
      .maybeSingle()

    if (sessionError || !session) {
      console.log('Invalid session:', sessionError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      console.log('Session expired')
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate license is still active
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id, status, expires_at')
      .eq('id', session.license_id)
      .single()

    if (licenseError || !license) {
      console.log('License not found:', licenseError?.message)
      return new Response(
        JSON.stringify({ error: 'License not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (license.status !== 'active') {
      console.log('License not active:', license.status)
      return new Response(
        JSON.stringify({ error: 'License is not active' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(license.expires_at) < new Date()) {
      console.log('License expired')
      return new Response(
        JSON.stringify({ error: 'License has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get webhook URL from system config
    const { data: config, error: configError } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'n8n_webhook_url')
      .single()

    if (configError || !config) {
      console.error('Webhook URL not configured:', configError?.message)
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update session last activity
    await supabase
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', session.id)

    console.log('Webhook URL retrieved successfully for license:', license.id)

    return new Response(
      JSON.stringify({ 
        webhook_url: config.value,
        license_id: license.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
