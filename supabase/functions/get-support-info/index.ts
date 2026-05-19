import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

// Support configuration - stored server-side for security
const SUPPORT_CONFIG = {
  whatsapp: '+5516999171891',
  message: 'Olá! Preciso de suporte com a extensão Ilimitado.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only return support info, never expose internal configs
    const supportUrl = `https://wa.me/${SUPPORT_CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(SUPPORT_CONFIG.message)}`;

    return new Response(
      JSON.stringify({
        whatsapp_url: supportUrl,
        display_number: SUPPORT_CONFIG.whatsapp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
