import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const user = userData.user;
    const userId = user.id;
    const email = user.email || '';
    const meta: any = user.user_metadata || {};

    const body = await req.json().catch(() => ({}));
    const name =
      (body.name || meta.full_name || meta.name || email.split('@')[0] || 'Revendedor')
        .toString()
        .trim()
        .slice(0, 120);
    const company = (body.company || '').toString().trim().slice(0, 120) || null;
    const phone = (body.phone || meta.phone || '').toString().trim().slice(0, 30) || null;

    const admin = createClient(supabaseUrl, serviceKey);

    // Bloqueia se já tem role privilegiada
    const { data: existingRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const roleList = (existingRoles || []).map((r: any) => r.role);
    const hasPrivileged = roleList.some((r: string) =>
      ['admin', 'manager', 'apollo'].includes(r)
    );

    if (hasPrivileged) {
      return new Response(
        JSON.stringify({
          error: 'Esta conta já possui outro tipo de acesso. Use o login normal.',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Garante perfil em reseller_profiles (sempre como pending para aprovação)
    const { data: existingProfile } = await admin
      .from('reseller_profiles')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: insertErr } = await admin.from('reseller_profiles').insert({
        user_id: userId,
        name,
        company,
        phone,
        status: 'pending',
      });
      if (insertErr) {
        console.error('[register-reseller-self] profile insert error', insertErr);
        return new Response(
          JSON.stringify({ error: 'Falha ao criar perfil de revendedor' }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: existingProfile?.status || 'pending',
        already_existed: !!existingProfile,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[register-reseller-self] error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
