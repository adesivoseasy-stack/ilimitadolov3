import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id
    const email = userData.user.email || ''
    const body = await req.json().catch(() => ({}))
    const name = (body.name || email.split('@')[0] || 'Cliente').toString().trim().slice(0, 120)
    const phone = (body.phone || '').toString().trim().slice(0, 20) || null

    const admin = createClient(supabaseUrl, serviceKey)

    // Bloqueia se o usuário já tem qualquer outra role significativa
    const { data: existingRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    const roleList = (existingRoles || []).map((r: any) => r.role)
    const hasOther = roleList.some((r: string) =>
      ['admin', 'manager', 'reseller', 'apollo'].includes(r)
    )

    // Garante role credits_customer (apenas se não tiver outra role mais forte)
    if (!hasOther && !roleList.includes('credits_customer')) {
      await admin.from('user_roles').insert({
        user_id: userId,
        role: 'credits_customer',
      })
    }

    // Garante perfil em credits_customers
    const { data: existingProfile } = await admin
      .from('credits_customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingProfile) {
      const { error: insertErr } = await admin
        .from('credits_customers')
        .insert({ user_id: userId, name, phone })
      if (insertErr) {
        console.error('[register-credits-customer] insert error', insertErr)
      }
    }

    return new Response(JSON.stringify({ success: true, has_other_role: hasOther }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[register-credits-customer] error', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
