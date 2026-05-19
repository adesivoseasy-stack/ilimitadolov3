import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYNCPAY_API = 'https://api.syncpayments.com.br'

const PACKAGES: Record<number, number> = {
  10: 190, 50: 590, 100: 890, 200: 1690, 300: 2390,
  500: 3890, 1000: 7490, 2000: 14390, 3000: 20990, 5000: 33990,
}

async function readResponseData(res: Response) {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function getSyncPayToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${SYNCPAY_API}/api/partner/v1/auth-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  const data = await readResponseData(res)
  if (!res.ok || !data.access_token) {
    console.error('[create-lvb-pix] SyncPay auth failed:', JSON.stringify({ status: res.status, data }))
    throw new Error('Falha na autenticação SyncPay')
  }
  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('[create-lvb-pix] Missing env vars:', JSON.stringify({ hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey, hasServiceRoleKey: !!serviceRoleKey }))
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = userData.user.id

    const { data: roles } = await userClient.from('user_roles').select('role').eq('user_id', userId)
    const userRoles = (roles || []).map((r: any) => r.role)
    if (!userRoles.some((r: string) => ['reseller', 'apollo', 'admin', 'manager', 'credits_customer'].includes(r))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const creditos = parseInt(body.creditos)
    const customerName = (body.customerName || '').trim()
    const customerEmail = (body.customerEmail || '').trim()
    const customerPhone = (body.customerPhone || '').replace(/\D/g, '')
    const customerDocument = (body.customerDocument || '').replace(/\D/g, '')
    const source = body.source === 'creditos_page' ? 'creditos_page' : 'reseller_panel'

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Para a página pública /creditos usamos a tabela de preços separada (creditos_pkg_*).
    // Para o painel do revendedor mantemos lvb_package_*.
    const priceKey = source === 'creditos_page' ? `creditos_pkg_${creditos}` : `lvb_package_${creditos}`

    let amountCents: number
    const { data: customPrice } = await adminClient
      .from('system_config')
      .select('value')
      .eq('key', priceKey)
      .maybeSingle()

    if (customPrice?.value) {
      amountCents = Math.round(parseFloat(customPrice.value) * 100)
    } else if (PACKAGES[creditos]) {
      amountCents = PACKAGES[creditos]
    } else {
      return new Response(JSON.stringify({ error: 'Pacote inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const totalReais = amountCents / 100

    const { data: authData } = await adminClient.auth.admin.getUserById(userId)
    const email = (customerEmail || authData?.user?.email || 'reseller@email.com').trim().slice(0, 255)
    const name = (customerName || 'Revendedor').trim().slice(0, 120)
    const phone = (customerPhone || '11999999999').slice(0, 11)
    const document = customerDocument

    if (!document) {
      return new Response(JSON.stringify({ error: 'CPF/CNPJ é obrigatório. Informe no formulário.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const clientId = Deno.env.get('SYNCPAY_CLIENT_ID') || ''
    const clientSecret = Deno.env.get('SYNCPAY_CLIENT_SECRET') || ''
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Credenciais de pagamento não configuradas' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const accessToken = await getSyncPayToken(clientId, clientSecret)
    const webhookUrl = `${supabaseUrl}/functions/v1/syncpay-webhook`

    const cashInPayload = {
      amount: totalReais,
      description: `Créditos Lovable (${creditos} un)`,
      webhook_url: webhookUrl,
      client: {
        name,
        cpf: document,
        email,
        phone,
      },
    }

    console.log('[create-lvb-pix] Generating PIX for', creditos, 'credits, R$', totalReais)

    const syncPayRes = await fetch(`${SYNCPAY_API}/api/partner/v1/cash-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(cashInPayload),
    })

    const syncPayData = await readResponseData(syncPayRes)
    if (!syncPayRes.ok) {
      console.error('[create-lvb-pix] SyncPay error:', JSON.stringify({ status: syncPayRes.status, data: syncPayData }))
      return new Response(JSON.stringify({ error: 'Erro ao gerar PIX', details: syncPayData }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const pixCode = syncPayData.pix_code || syncPayData.copy_paste || ''
    const identifier = syncPayData.identifier || syncPayData.id || syncPayData.idtransaction || ''

    console.log('[create-lvb-pix] SyncPay cash-in success, identifier:', identifier)

    const { data: order, error: orderError } = await adminClient
      .from('lvb_credit_orders')
      .insert({
        reseller_id: userId,
        creditos,
        amount_cents: amountCents,
        status: 'pending_payment',
        payment_order_id: identifier,
        pix_qr_code: '',
        pix_code_text: pixCode,
        source,
      })
      .select('id')
      .single()

    if (orderError) {
      console.error('[create-lvb-pix] DB error:', orderError)
      return new Response(JSON.stringify({ error: 'Erro ao salvar pedido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      order_id: order.id,
      pix_code_text: pixCode,
      pix_qr_code: '',
      amount_cents: amountCents,
      creditos,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[create-lvb-pix] Error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})