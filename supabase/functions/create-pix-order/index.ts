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
  lifetime: z.boolean().optional(),
  lifetimeBulk: z.boolean().optional(),
  combo: z.boolean().optional(),
  comboChampion: z.boolean().optional(),
  comboAccount: z.boolean().optional(),
  manusCredits: z.boolean().optional(),
  geminiPro: z.boolean().optional(),
  seedanceAccount: z.boolean().optional(),
  renewal: z.boolean().optional(),
  licenseId: z.string().uuid().optional(),
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

    let { quantity, customerName, customerEmail, customerPhone, customerDocument, promo, lifetime, lifetimeBulk, combo, comboChampion, comboAccount, manusCredits, geminiPro, seedanceAccount, renewal, licenseId } = bodyResult.data
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
    let renewalLicenseId: string | null = null

    if (renewal) {
      // Renovação manual via PIX: R$ 34,90 para +30 dias na chave indicada.
      if (!licenseId) {
        return new Response(JSON.stringify({ error: 'licenseId obrigatório para renovação' }), { status: 400, headers: corsHeaders })
      }
      const { data: lic, error: licErr } = await adminClient
        .from('licenses')
        .select('id, created_by, status, is_wildcard, license_key')
        .eq('id', licenseId)
        .single()
      if (licErr || !lic) {
        return new Response(JSON.stringify({ error: 'Licença não encontrada' }), { status: 404, headers: corsHeaders })
      }
      if (lic.created_by !== userId) {
        return new Response(JSON.stringify({ error: 'Você não tem permissão para renovar esta licença' }), { status: 403, headers: corsHeaders })
      }
      if (lic.is_wildcard) {
        return new Response(JSON.stringify({ error: 'Chaves coringa não são renováveis' }), { status: 400, headers: corsHeaders })
      }
      quantity = 1
      totalReais = 34.90
      pricePerKey = 34.90
      renewalLicenseId = lic.id
      promo = false
    } else if (manusCredits) {
      // 1000 Créditos Manus AI — R$ 39,90 (entrega manual via ADM)
      quantity = 1
      totalReais = 39.90
      pricePerKey = 39.90
      promo = false
    } else if (geminiPro) {
      // Gemini Pro - 18 Meses de Assinatura — R$ 97,00 (entrega manual via ADM)
      quantity = 1
      totalReais = 97.00
      pricePerKey = 97.00
      promo = false
    } else if (seedanceAccount) {
      // Conta Seedance com 8.500K créditos — R$ 19,90 (entrega manual via ADM)
      quantity = 1
      totalReais = 19.90
      pricePerKey = 19.90
      promo = false
    } else if (comboAccount) {
      // Combo Conta Lovable: Conta Lovable + 300 Créditos + 1 Ano PRO — R$ 129,90
      quantity = 1
      totalReais = 129.90
      pricePerKey = 129.90
      promo = false
    } else if (comboChampion) {
      // Combo Copa do Brasil: 300 Créditos Lovable + 1 Ano PRO Lite + Chave Vitalícia — R$ 149,90
      quantity = 1
      totalReais = 149.90
      pricePerKey = 149.90
      promo = false
    } else if (combo) {
      // Combo: 300 Créditos Lovable + 1 Ano PRO Lite — R$ 89,90
      quantity = 1
      totalReais = 89.90
      pricePerKey = 89.90
      promo = false
    } else if (lifetimeBulk) {
      // Promoção Vitalícia em Lote: 10 chaves vitalícias por R$ 299,00
      // Válido até 03/07/2026 às 20h
      const LIFETIME_BULK_END = new Date('2026-07-26T20:00:00-03:00').getTime()
      if (Date.now() >= LIFETIME_BULK_END) {
        return new Response(JSON.stringify({ error: 'Promoção de vitalícias em lote encerrada' }), { status: 400, headers: corsHeaders })
      }
      quantity = 10
      totalReais = 299.00
      pricePerKey = 29.90
      promo = false
    } else if (lifetime) {
      // Chave Vitalícia: 1 chave com validade ilimitada (100 anos)
      // Promoção Relâmpago: R$ 79,90 até 05/07/2026 às 20h, depois R$ 147,90
      quantity = 1
      // Override individual: wallacesouzasantos@gmail.com paga R$ 29,90
      const { data: buyerData } = await adminClient.auth.admin.getUserById(userId)
      const buyerEmail = (buyerData?.user?.email || '').toLowerCase()
      if (buyerEmail === 'wallacesouzasantos@gmail.com' || buyerEmail === 'ecombrunobp@gmail.com' || buyerEmail === 'techmind.pro4.0@gmail.com') {
        totalReais = 29.90
      } else {
        const LIFETIME_PROMO_END = new Date('2026-07-26T20:00:00-03:00').getTime()
        const isLifetimePromo = Date.now() < LIFETIME_PROMO_END
        totalReais = isLifetimePromo ? 79.90 : 147.90
      }
      pricePerKey = totalReais
      promo = false
    } else if (promo) {
      // Promoção de Inauguração: pacote fixo 10 chaves por R$249,90 (24h)
      const PROMO_START = new Date('2026-05-19T16:20:00-03:00').getTime()
      const PROMO_END = new Date('2026-05-20T16:20:00-03:00').getTime()
      const nowMs = Date.now()
      if (nowMs < PROMO_START || nowMs >= PROMO_END) {
        return new Response(JSON.stringify({ error: 'Promoção de inauguração encerrada' }), { status: 400, headers: corsHeaders })
      }
      if (quantity !== 10) {
        return new Response(JSON.stringify({ error: 'Pacote promocional exige exatamente 10 chaves' }), { status: 400, headers: corsHeaders })
      }
      totalReais = 249.90
      pricePerKey = 24.99
    } else if (profile.custom_key_price != null && profile.custom_key_price > 0) {
      pricePerKey = parseFloat(profile.custom_key_price)
      totalReais = parseFloat((quantity * pricePerKey).toFixed(2))
    } else {
      // Promoção relâmpago mensal: 1 chave R$ 34,90 até 04/06/2026 às 20h
      const MONTHLY_PROMO_END = new Date('2026-06-04T20:00:00-03:00').getTime()
      if (quantity === 1 && Date.now() < MONTHLY_PROMO_END) {
        totalReais = 34.90
        pricePerKey = 34.90
      } else {
        totalReais = await calculateTotal(adminClient, profile.plan_type, quantity)
        pricePerKey = totalReais / quantity
      }
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
        product_type: renewal ? 'renewal' : (seedanceAccount ? 'seedance_account' : (geminiPro ? 'gemini_pro' : (manusCredits ? 'manus_credits' : (comboAccount ? 'combo_account' : (comboChampion ? 'combo_champion' : (combo ? 'combo' : ((lifetime || lifetimeBulk) ? 'lifetime' : 'standard'))))))),
        target_license_id: renewalLicenseId,
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
    '197': [{ quantity: 1, pricePerKey: 34.90 }],
    '297': [{ quantity: 1, pricePerKey: 34.90 }],
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
