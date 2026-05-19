import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'npm:zod'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

const SYNCPAY_API = 'https://api.syncpayments.com.br'

const BodySchema = z.object({
  quantity: z.number().int().min(1).max(1000),
  customerName: z.string().trim().max(120).optional().default(''),
  customerEmail: z.string().trim().email().max(255).optional().or(z.literal('')).default(''),
  customerPhone: z.string().trim().max(20).optional().default(''),
  customerDocument: z.string().trim().max(20).optional().default(''),
  promo: z.boolean().optional(),
})

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
    console.error('[create-pix-order] SyncPay auth failed:', JSON.stringify({ status: res.status, data }))
    throw new Error('Falha na autenticação SyncPay')
  }

  return data.access_token
}

async function createSyncPayPix(
  accessToken: string, totalReais: number, quantity: number,
  name: string, email: string, phone: string, document: string,
  webhookUrl: string
) {
  const cashInPayload = {
    amount: totalReais,
    description: `Créditos LovBoost (${quantity} un)`,
    webhook_url: webhookUrl,
    client: { name, cpf: document, email, phone },
  }

  console.log('[create-pix-order] Calling SyncPay cash-in for quantity:', quantity, 'total: R$', totalReais)

  const res = await fetch(`${SYNCPAY_API}/api/partner/v1/cash-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(cashInPayload),
  })

  const data = await readResponseData(res)
  if (!res.ok) {
    console.error('[create-pix-order] SyncPay error:', JSON.stringify({ status: res.status, data }))
    const rawMsg = (data?.message || data?.error || '').toString()
    if (/max_cashin_without_fee/i.test(rawMsg)) {
      throw new Error(`Valor de R$ ${totalReais.toFixed(2)} excede o limite atual do gateway de pagamento. Reduza a quantidade de chaves ou contate o administrador para ajustar o limite no SyncPay.`)
    }
    throw new Error(rawMsg ? `Gateway de pagamento: ${rawMsg}` : 'Erro ao gerar PIX na SyncPay')
  }

  return {
    pixCode: data.pix_code || data.copy_paste || '',
    pixQrCode: data.qr_code || '',
    orderId: data.identifier || data.id || data.idtransaction || '',
  }
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
      console.error('[create-pix-order] Missing env vars:', JSON.stringify({ hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey, hasServiceRoleKey: !!serviceRoleKey }))
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), { status: 500, headers: corsHeaders })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const bodyResult = BodySchema.safeParse(await req.json())
    if (!bodyResult.success) {
      return new Response(JSON.stringify({ error: 'Dados inválidos', details: bodyResult.error.flatten() }), {
        status: 400, headers: corsHeaders,
      })
    }

    const { quantity, customerName, customerEmail, customerPhone, customerDocument, promo } = bodyResult.data
    const userId = authUser.id

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const { data: profile, error: profileError } = await adminClient
      .from('reseller_profiles')
      .select('plan_type, name, phone, document, custom_key_price')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Perfil de revendedor não encontrado' }), { status: 404, headers: corsHeaders })
    }

    if (profile.plan_type === '997') {
      return new Response(JSON.stringify({ error: 'Plano ilimitado não precisa comprar créditos' }), { status: 400, headers: corsHeaders })
    }

    let totalReais: number
    let pricePerKey: number

    if (promo) {
      // Promoção Relâmpago: preço fixo R$29,90 por chave (só hoje até 20h)
      pricePerKey = 29.90
      totalReais = parseFloat((quantity * pricePerKey).toFixed(2))
    } else if (profile.custom_key_price != null && profile.custom_key_price > 0) {
      pricePerKey = parseFloat(profile.custom_key_price)
      totalReais = parseFloat((quantity * pricePerKey).toFixed(2))
    } else {
      totalReais = await calculateTotal(adminClient, profile.plan_type, quantity)
      pricePerKey = totalReais / quantity
    }

    const { data: userData } = await adminClient.auth.admin.getUserById(userId)
    const fallbackEmail = userData?.user?.email || 'reseller@email.com'

    const name = (customerName || 'Revendedor').trim().slice(0, 120)
    const email = (customerEmail || fallbackEmail).trim().slice(0, 255)
    const phoneNumber = normalizeDigits(customerPhone || '11999999999').slice(0, 11)
    const document = normalizeDigits(customerDocument)

    if (!document) {
      return new Response(JSON.stringify({ error: 'CPF/CNPJ é obrigatório para gerar o PIX' }), {
        status: 400, headers: corsHeaders,
      })
    }

    if (!isValidBrazilianDocument(document)) {
      return new Response(JSON.stringify({ error: 'CPF/CNPJ inválido' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const totalCents = Math.round(totalReais * 100)

    const syncClientId = Deno.env.get('SYNCPAY_CLIENT_ID') || ''
    const syncClientSecret = Deno.env.get('SYNCPAY_CLIENT_SECRET') || ''

    if (!syncClientId || !syncClientSecret) {
      return new Response(JSON.stringify({ error: 'Credenciais SyncPay não configuradas' }), { status: 500, headers: corsHeaders })
    }

    const accessToken = await getSyncPayToken(syncClientId, syncClientSecret)
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/syncpay-webhook`
    const pixResult = await createSyncPayPix(accessToken, totalReais, quantity, name, email, phoneNumber, document, webhookUrl)

    const { data: order, error: orderError } = await adminClient
      .from('credit_orders')
      .insert({
        reseller_id: userId,
        quantity,
        amount_cents: totalCents,
        status: 'pending',
        pagseguro_order_id: pixResult.orderId,
        qr_code_text: pixResult.pixCode,
        qr_code_image_url: pixResult.pixQrCode,
        customer_name: name,
        customer_email: email,
        customer_phone: phoneNumber,
        customer_document: document,
      })
      .select()
      .single()

    if (orderError) {
      console.error('[create-pix-order] DB error:', orderError)
      return new Response(JSON.stringify({ error: 'Erro ao salvar pedido' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({
      pixCode: pixResult.pixCode,
      pixQrCode: pixResult.pixQrCode,
      orderId: pixResult.orderId,
      order_id: order.id,
      qr_code_text: pixResult.pixCode,
      qr_code_image_url: pixResult.pixQrCode,
      amount_cents: totalCents,
      quantity,
      price_per_key: pricePerKey,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[create-pix-order] Error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders })
  }
})

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function isValidBrazilianDocument(value: string) {
  return isValidCpf(value) || isValidCnpj(value)
}

function isValidCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(value[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(value[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(value[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(value[10])
}

function isValidCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false
  const calculate = (length: number) => {
    const numbers = value.slice(0, length)
    let factor = length - 7
    let total = 0
    for (let i = length; i >= 1; i--) {
      total += Number(numbers[length - i]) * factor--
      if (factor < 2) factor = 9
    }
    return total % 11 < 2 ? 0 : 11 - (total % 11)
  }
  const digit1 = calculate(12)
  const digit2 = calculate(13)
  return digit1 === Number(value[12]) && digit2 === Number(value[13])
}

async function calculateTotal(adminClient: any, planType: string, quantity: number): Promise<number> {
  const prefix = `reseller_key_tier_${planType}_`
  const { data: configData } = await adminClient
    .from('system_config')
    .select('key, value')
    .like('key', `${prefix}%`)

  const configMap = new Map((configData || []).map((c: any) => [c.key, c.value]))
  const tiers: { quantity: number; pricePerKey: number }[] = []
  for (let i = 1; i <= 10; i++) {
    const qty = configMap.get(`${prefix}${i}_qty`)
    const price = configMap.get(`${prefix}${i}_price`)
    if (qty && price) {
      tiers.push({ quantity: parseInt(qty as string), pricePerKey: parseFloat(price as string) })
    }
  }

  const DEFAULT_TIERS: Record<string, { quantity: number; pricePerKey: number }[]> = {
    '197': [{ quantity: 1, pricePerKey: 49.90 }],
    '297': [{ quantity: 1, pricePerKey: 29.90 }],
  }

  const activeTiers = tiers.length > 0 ? tiers.sort((a, b) => a.quantity - b.quantity) : (DEFAULT_TIERS[planType] || DEFAULT_TIERS['197'])
  const sorted = [...activeTiers].sort((a, b) => b.quantity - a.quantity)
  const maxTier = sorted[0]
  let pricePerKey: number
  if (quantity > maxTier.quantity) {
    pricePerKey = parseFloat((maxTier.pricePerKey * 0.95).toFixed(2))
  } else {
    const tier = sorted.find(t => quantity >= t.quantity)
    pricePerKey = tier ? tier.pricePerKey : sorted[sorted.length - 1].pricePerKey
  }

  return quantity * pricePerKey
}
