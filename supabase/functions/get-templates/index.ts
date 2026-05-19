import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json; charset=utf-8',
};

interface Template {
  id: string;
  name: string;
  description: string | null;
  code: string;
  image_url: string | null;
  video_url: string | null;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session token from header
    const sessionToken = req.headers.get('x-session-token');

    if (!sessionToken) {
      console.log('Missing session token');
      return new Response(JSON.stringify({
        status: 'session_invalid',
        message: 'Missing session token',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, licenses(*)')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (sessionError || !session) {
      console.log('Invalid session token');
      return new Response(JSON.stringify({
        status: 'session_invalid',
        message: 'Invalid session token',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if session expired
    const now = new Date();
    const sessionExpires = new Date(session.expires_at);
    
    if (now > sessionExpires) {
      console.log('Session expired');
      await supabase.from('sessions').delete().eq('id', session.id);
      return new Response(JSON.stringify({
        status: 'session_expired',
        message: 'Session has expired, please re-authenticate',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if license is still valid
    const license = session.licenses;
    if (license.status === 'revoked' || license.status === 'expired') {
      console.log('License no longer valid');
      await supabase.from('sessions').delete().eq('id', session.id);
      return new Response(JSON.stringify({
        status: 'session_invalid',
        message: 'License is no longer valid',
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch active templates
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('id, name, description, code, image_url, video_url, category')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Failed to fetch templates',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Returning ${templates?.length || 0} templates`);

    return new Response(JSON.stringify({
      status: 'success',
      templates: templates as Template[],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
