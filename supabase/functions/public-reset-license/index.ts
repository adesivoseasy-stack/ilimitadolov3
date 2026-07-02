import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { license_key } = await req.json().catch(() => ({}));
    const key = String(license_key || '').trim().toUpperCase();
    if (!key || key.length < 8) {
      return json({ error: 'Chave inválida.' }, 400);
    }

    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, status, is_wildcard, expires_at, hwid')
      .eq('license_key', key)
      .maybeSingle();

    if (error) {
      console.error('[public-reset-license] db error', error);
      return json({ error: 'Erro interno. Tente novamente.' }, 500);
    }
    if (!license) return json({ error: 'Chave não encontrada.' }, 404);
    if (license.status === 'revoked') return json({ error: 'Esta chave foi revogada.' }, 403);

    if (!license.is_wildcard && license.expires_at && new Date(license.expires_at) <= new Date()) {
      return json({ error: 'Esta chave está expirada.' }, 403);
    }

    const { error: updErr } = await supabase
      .from('licenses')
      .update({ hwid: null, hwid_set_at: null })
      .eq('id', license.id);
    if (updErr) {
      console.error('[public-reset-license] update error', updErr);
      return json({ error: 'Falha ao resetar.' }, 500);
    }

    await supabase.from('devices').delete().eq('license_id', license.id);
    await supabase.from('sessions').delete().eq('license_id', license.id);
    await supabase.from('license_logs').insert({
      license_id: license.id,
      action: 'public_hwid_reset',
      details: {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        previous_hwid: license.hwid || null,
      },
    });

    return json({ success: true, message: 'Dispositivo resetado com sucesso! Ative a extensão no novo computador.' });
  } catch (e) {
    console.error('[public-reset-license] unexpected', e);
    return json({ error: 'Erro interno.' }, 500);
  }
});