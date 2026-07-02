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

    const { key, email, hwid } = await req.json().catch(() => ({}));
    const trimmed = String(key || '').trim();
    const hwidTrimmed = String(hwid || '').trim() || null;
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

    const normEmail = String(email || '').trim().toLowerCase() || null;

    // ── HWID bind ───────────────────
    // A extensão pode validar pela própria UUID e também pelo HWID derivado
    // no servidor. Se o HWID já existe em `devices`, ele é considerado o
    // mesmo dispositivo e não deve desconectar a licença.
    let boundHwid: string | null = license.hwid ?? null;
    if (hwidTrimmed && !license.is_wildcard) {
      const { data: knownDevices } = await supabase
        .from('devices')
        .select('id, hwid')
        .eq('license_id', license.id)
        .eq('hwid', hwidTrimmed)
        .limit(1);

      const isKnownDevice = Array.isArray(knownDevices) && knownDevices.length > 0;

      if (!license.hwid) {
        // Post-reset guard: se este HWID acabou de ser resetado (< 10 min),
        // é o PC antigo tentando re-vincular sozinho. Bloqueia para o
        // usuário conseguir ativar no PC novo.
        const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
        const { data: recentReset } = await supabase
          .from('license_logs')
          .select('details, created_at')
          .eq('license_id', license.id)
          .eq('action', 'public_hwid_reset')
          .gte('created_at', tenMinAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const prevHwid = (recentReset?.details as any)?.previous_hwid;
        if (prevHwid && prevHwid === hwidTrimmed) {
          console.warn('[inject-config] Rebind blocked (recent reset) | key:', trimmed.slice(0, 8));
          return json({
            error: 'Esta chave foi resetada recentemente. Ative a extensão no NOVO computador. Se você já está no novo, feche a extensão no PC antigo e tente novamente em alguns minutos.',
          }, 403);
        }

        const { error: updErr } = await supabase
          .from('licenses')
          .update({ hwid: hwidTrimmed, hwid_set_at: now.toISOString() })
          .eq('id', license.id);
        if (updErr) {
          console.error('[inject-config] hwid update error', updErr);
        } else {
          boundHwid = hwidTrimmed;
        }
      } else if (license.hwid !== hwidTrimmed && !isKnownDevice) {
        console.warn('[inject-config] HWID mismatch | key:', trimmed.slice(0, 8));
        return json({
          error: 'Esta chave já está vinculada a outro dispositivo. Acesse o painel e clique em "Resetar Dispositivo" para trocar.',
        }, 403);
      } else if (isKnownDevice) {
        boundHwid = hwidTrimmed;
      }
    }

    // Espelha o HWID na tabela `devices` para aparecer no painel.
    if (hwidTrimmed) {
      const { data: existingDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('license_id', license.id)
        .eq('hwid', hwidTrimmed)
        .limit(1);

      const existingDevice = Array.isArray(existingDevices) ? existingDevices[0] : null;

      if (existingDevice) {
        await supabase
          .from('devices')
          .update({ last_seen_at: now.toISOString() })
          .eq('id', existingDevice.id);
      } else {
        await supabase.from('devices').insert({
          license_id: license.id,
          hwid: hwidTrimmed,
          device_name: 'LOV-ULTRA',
        });
      }
    }

    return json({
      config: { ok: true, source: 'ilimitado-lov3', ts: Date.now() },
      license: {
        plan: license.is_wildcard ? 'wildcard' : (isTestLike ? 'test' : 'paid'),
        expires_at: license.is_wildcard ? null : (expiresAt ? expiresAt.toISOString() : null),
        bound_email: license.email || normEmail || null,
        hwid: boundHwid,
      },
    }, 200);
  } catch (e) {
    console.error('[inject-config] unexpected', e);
    return json({ error: 'invalid: erro interno' }, 500);
  }
});