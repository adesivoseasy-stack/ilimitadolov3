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

    const { key, email } = await req.json().catch(() => ({}));
    const trimmed = String(key || '').trim();
    if (!trimmed) return json({ error: 'invalid: chave vazia' }, 400);

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', trimmed)
      .maybeSingle();

    if (error) {
      console.error('[inject-config] db error', error);
      return json({ error: 'invalid' }, 500);
    }
    if (!license) return json({ error: 'invalid: chave não encontrada' }, 403);
    if (license.status === 'revoked') return json({ error: 'invalid: chave revogada' }, 403);

    // First activation for time-bounded licenses
    const now = new Date();
    let expiresAt = license.expires_at ? new Date(license.expires_at) : null;
    const isTestLike = !!license.duration_hours && license.duration_hours <= 0.5;

    if (license.duration_hours && !license.first_activated_at) {
      let effective = license.duration_hours;
      if (isTestLike) effective = Math.min(effective, 10 / 60);
      expiresAt = new Date(now.getTime() + effective * 3600 * 1000);
      await supabase.from('licenses').update({
        first_activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        duration_hours: effective,
      }).eq('id', license.id);
    }

    if (!license.is_wildcard && expiresAt && expiresAt <= now) {
      if (license.status !== 'expired') {
        await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
      }
      return json({ error: 'expirada' }, 403);
    }

    // Email binding (optional)
    const normEmail = String(email || '').trim().toLowerCase() || null;
    if (normEmail) {
      if (license.email && license.email.toLowerCase() !== normEmail) {
        return json({ error: 'vinculada a outro email' }, 403);
      }
      if (!license.email) {
        await supabase.from('licenses').update({ email: normEmail }).eq('id', license.id);
      }
    }

    return json({
      config: { ok: true, source: 'ilimitado-lov3', ts: Date.now() },
      license: {
        plan: license.is_wildcard ? 'wildcard' : (isTestLike ? 'test' : 'paid'),
        expires_at: license.is_wildcard ? null : (expiresAt ? expiresAt.toISOString() : null),
        bound_email: license.email || normEmail || null,
      },
    }, 200);
  } catch (e) {
    console.error('[inject-config] unexpected', e);
    return json({ error: 'invalid: erro interno' }, 500);
  }
});