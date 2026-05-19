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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').toString().trim().toLowerCase()
    const name = (body.name || email.split('@')[0] || 'Cliente').toString().trim().slice(0, 120)
    const phone = (body.phone || '').toString().trim().slice(0, 20) || null

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Localiza usuário por email (paginando até 5 páginas)
    let user: any = null
    for (let page = 1; page <= 5 && !user; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) break
      user = data.users.find((u) => (u.email || '').toLowerCase() === email) || null
      if (data.users.length < 200) break
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Bloqueia se já tem outra role (segurança: não confirmar contas de admin/reseller)
    const { data: existingRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const roleList = (existingRoles || []).map((r: any) => r.role)
    const hasOther = roleList.some((r: string) =>
      ['admin', 'manager', 'reseller', 'apollo'].includes(r)
    )

    if (hasOther) {
      return new Response(JSON.stringify({ error: 'Conta já cadastrada com outro perfil' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Confirma email automaticamente (bypass de verificação)
    if (!user.email_confirmed_at) {
      await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
    }

    // Garante role
    if (!roleList.includes('credits_customer')) {
      await admin.from('user_roles').insert({ user_id: user.id, role: 'credits_customer' })
    }

    // Garante perfil
    const { data: existingProfile } = await admin
      .from('credits_customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      await admin.from('credits_customers').insert({ user_id: user.id, name, phone })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[confirm-credits-signup] error', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
