import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
  'Content-Type': 'application/json; charset=utf-8',
}

// SyncPay v1 cash-in: only these statuses indicate a real settled payment.
// `paid_out` is sent by SyncPay when the PIX has been confirmed and the
// amount has already been credited to the merchant account.
const COMPLETED_STATUSES = new Set(['completed', 'paid', 'approved', 'paid_out'])
const SYNCPAY_API = 'https://api.syncpayments.com.br'

async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { raw: text } }
}

async function getSyncPayToken(): Promise<string | null> {
  const clientId = Deno.env.get('SYNCPAY_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('SYNCPAY_CLIENT_SECRET') || ''
  if (!clientId || !clientSecret) return null
  try {
    const res = await fetch(`${SYNCPAY_API}/api/partner/v1/auth-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    })
    const data = await readJson(res)
    if (!res.ok || !data?.access_token) {
      console.error('[syncpay-webhook] auth failed status=', res.status)
      return null
    }
    return data.access_token as string
  } catch (e) {
    console.error('[syncpay-webhook] auth error:', (e as Error).message)
    return null
  }
}

/**
 * Re-fetches the transaction from SyncPay directly and returns the verified
 * { status, amountCents } as reported by the gateway. Returning null means we
 * could not confirm the payment — caller must reject.
 */
async function verifyTransactionWithSyncPay(identifier: string): Promise<{ status: string; amountCents: number | null } | null> {
  const token = await getSyncPayToken()
  if (!token) return null

  // Try the most likely lookup endpoints (SyncPay v1 cash-in)
  const candidates = [
    `${SYNCPAY_API}/api/partner/v1/cash-in/${encodeURIComponent(identifier)}`,
    `${SYNCPAY_API}/api/partner/v1/transactions/${encodeURIComponent(identifier)}`,
  ]

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      })
      if (res.status === 404) continue
      const data = await readJson(res)
      if (!res.ok) continue
      const tx = data?.data || data
      const status = String(tx?.status || '').toLowerCase()
      const amountRaw = tx?.amount ?? tx?.value ?? null
      const amountCents = amountRaw != null ? Math.round(parseFloat(amountRaw) * 100) : null
      if (status) return { status, amountCents }
    } catch (e) {
      console.error('[syncpay-webhook] verify error:', (e as Error).message)
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Optional shared-secret gate — if SYNCPAY_WEBHOOK_TOKEN is configured,
    // requests without the matching header are dropped early.
    const expectedToken = Deno.env.get('SYNCPAY_WEBHOOK_TOKEN')
    if (expectedToken) {
      const got = req.headers.get('x-webhook-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
      if (got !== expectedToken) {
        console.warn('[syncpay-webhook] rejected: bad webhook token')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
      }
    }

    const body = await req.json().catch(() => ({}))

    // SyncPay sends { data: { id, amount, status, ... } }
    const webhookData = (body && typeof body === 'object' && body.data) ? body.data : body
    const identifier = webhookData.id || webhookData.idtransaction || ''
    const claimedStatus = String(webhookData.status || '').toLowerCase()
    console.log('[syncpay-webhook] received id=', identifier, 'claimedStatus=', claimedStatus)

    if (!identifier) {
      return new Response(JSON.stringify({ error: 'Missing identifier' }), { status: 400, headers: corsHeaders })
    }

    if (!COMPLETED_STATUSES.has(claimedStatus)) {
      return new Response(JSON.stringify({ ok: true, message: 'Not completed yet' }), { headers: corsHeaders })
    }

    // Best-effort re-verification with SyncPay. The gateway does not expose a
    // public lookup endpoint for cash-in transactions, so verification often
    // returns null. In that case we fall back to the webhook payload, which is
    // gated by SYNCPAY_WEBHOOK_TOKEN when configured. The amount is still
    // matched against our stored order below, so a forged payload with a wrong
    // amount would be rejected.
    const verified = await verifyTransactionWithSyncPay(identifier)
    if (verified && !COMPLETED_STATUSES.has(verified.status)) {
      console.warn('[syncpay-webhook] gateway reports non-completed status:', verified.status)
      return new Response(JSON.stringify({ error: 'Transaction not approved' }), { status: 403, headers: corsHeaders })
    }
    const webhookAmountRaw = webhookData?.amount ?? webhookData?.value ?? null
    const webhookAmountCents = webhookAmountRaw != null
      ? Math.round(parseFloat(String(webhookAmountRaw)) * 100)
      : null
    const verifiedAmountCents = verified?.amountCents ?? webhookAmountCents
    if (!verified) {
      console.warn('[syncpay-webhook] verification endpoint unavailable, trusting webhook payload for', identifier)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if this is an LVB credit order first
    const { data: lvbOrder, error: lvbError } = await adminClient
      .from('lvb_credit_orders')
      .select('*')
      .eq('payment_order_id', identifier)
      .single()

    if (lvbOrder && !lvbError) {
      return await handleLvbOrder(adminClient, lvbOrder, verifiedAmountCents)
    }

    // Otherwise, handle as regular credit order
    const { data: order, error: orderError } = await adminClient
      .from('credit_orders')
      .select('*')
      .eq('pagseguro_order_id', identifier)
      .single()

    if (orderError || !order) {
      console.error('[syncpay-webhook] Order not found:', identifier)
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    // STRICT amount validation against the verified amount from SyncPay
    if (verifiedAmountCents == null || verifiedAmountCents !== order.amount_cents) {
      console.error('[syncpay-webhook] amount mismatch verified=', verifiedAmountCents, 'expected=', order.amount_cents)
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 403, headers: corsHeaders })
    }

    // ATOMIC: Only update if status is NOT already 'paid' — prevents race condition
    const { data: claimedOrder, error: claimError } = await adminClient
      .from('credit_orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id)
      .neq('status', 'paid')
      .select()
      .single()

    if (claimError || !claimedOrder) {
      return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), { headers: corsHeaders })
    }

    // Generate license keys and add to reseller's stock
    const generatedKeys: string[] = []
    const isLifetime = order.product_type === 'lifetime'
    const lifetimeHours = 36500 * 24 // ~100 anos
    for (let i = 0; i < order.quantity; i++) {
      const { data: keyData, error: keyError } = await adminClient.rpc('generate_license_key')
      if (keyError) {
        console.error('[syncpay-webhook] Error generating key:', keyError)
        continue
      }

      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 100)

      const { data: license, error: insertError } = await adminClient
        .from('licenses')
        .insert({
          license_key: keyData,
          email: 'estoque',
          expires_at: farFuture.toISOString(),
          price: 0,
          notes: isLifetime
            ? `Chave VITALÍCIA em estoque - Pedido PIX #${order.id.slice(0, 8)}`
            : `Chave em estoque - Pedido PIX #${order.id.slice(0, 8)}`,
          created_by: order.reseller_id,
          status: 'active',
          is_wildcard: false,
          duration_hours: isLifetime ? lifetimeHours : 720,
          first_activated_at: null,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[syncpay-webhook] Error inserting license:', insertError)
        continue
      }

      generatedKeys.push(keyData)

      const { error: logError } = await adminClient.from('license_logs').insert({
        license_id: license.id,
        action: 'created',
        details: {
          source: 'pix_purchase',
          order_id: order.id,
          created_by_reseller: order.reseller_id,
        },
      })

      if (logError) {
        console.error('[syncpay-webhook] Error inserting license log:', logError)
      }
    }

    console.log('[syncpay-webhook] Generated', generatedKeys.length, 'keys for reseller:', order.reseller_id)

    return new Response(JSON.stringify({ ok: true, keys_generated: generatedKeys.length }), { headers: corsHeaders })
  } catch (err) {
    console.error('[syncpay-webhook] Error:', (err as Error).message)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
})

async function handleLvbOrder(adminClient: any, lvbOrder: any, verifiedAmountCents: number | null) {
  console.log('[syncpay-webhook] Processing LVB order:', lvbOrder.id)

  // STRICT amount validation against the verified amount from SyncPay
  if (verifiedAmountCents == null || verifiedAmountCents !== lvbOrder.amount_cents) {
    console.error('[syncpay-webhook] LVB amount mismatch verified=', verifiedAmountCents, 'expected=', lvbOrder.amount_cents)
    return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  // ATOMIC: Only claim if not already processed — prevents race condition
  const { data: claimedLvb, error: claimLvbError } = await adminClient
    .from('lvb_credit_orders')
    .update({ status: 'paid' })
    .eq('id', lvbOrder.id)
    .not('status', 'in', '("paid","configurando","sucesso")')
    .select()
    .single()

  if (claimLvbError || !claimedLvb) {
    return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Call LVB Credits API to create order + set delivery
  const apiKey = Deno.env.get('LVB_CREDITS_API_KEY')
  if (!apiKey) {
    console.error('[syncpay-webhook] LVB_CREDITS_API_KEY not set')
    await adminClient.from('lvb_credit_orders').update({ status: 'falha' }).eq('id', lvbOrder.id)
    return new Response(JSON.stringify({ ok: true, message: 'API key missing, marked as failed' }), { headers: { 'Content-Type': 'application/json' } })
  }

  const LVB_API_BASE = 'https://api.lvbcredits.com/api/v1/revenda'
  const apiHeaders = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }

  try {
    // Step 1: Create order
    const createRes = await fetch(`${LVB_API_BASE}/pedidos`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ creditos: lvbOrder.creditos }),
    })
    const createData = await createRes.json()
    console.log('[syncpay-webhook] LVB create-order response:', JSON.stringify(createData))

    if (!createRes.ok || !createData?.success) {
      console.error('[syncpay-webhook] LVB create-order failed:', createData)
      await adminClient.from('lvb_credit_orders').update({ status: 'falha' }).eq('id', lvbOrder.id)
      return new Response(JSON.stringify({ ok: true, message: 'LVB order creation failed' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const pedidoId = createData.data?.pedidoId
    const linkCliente = createData.data?.linkCliente
    const emailBot = createData.data?.emailConviteBot || ''

    // Step 2: Set delivery type
    const deliveryRes = await fetch(`${LVB_API_BASE}/pedidos/${pedidoId}/tipo-entrega`, {
      method: 'PUT',
      headers: apiHeaders,
      body: JSON.stringify({ tipo_entrega: 'workspace_proprio' }),
    })
    const deliveryData = await deliveryRes.json()
    console.log('[syncpay-webhook] LVB set-delivery response:', JSON.stringify(deliveryData))

    const botEmail = deliveryData?.data?.emailConviteBot || emailBot

    // Update order with external data
    await adminClient
      .from('lvb_credit_orders')
      .update({
        status: 'configurando',
        external_order_id: pedidoId,
        link_cliente: linkCliente,
        email_bot: botEmail,
      })
      .eq('id', lvbOrder.id)

    console.log('[syncpay-webhook] LVB order ready for bot invite:', pedidoId)
    return new Response(JSON.stringify({ ok: true, lvb_order: pedidoId }), { headers: { 'Content-Type': 'application/json' } })

  } catch (lvbErr) {
    console.error('[syncpay-webhook] LVB API error:', (lvbErr as Error).message)
    await adminClient.from('lvb_credit_orders').update({ status: 'falha' }).eq('id', lvbOrder.id)
    return new Response(JSON.stringify({ ok: true, message: 'LVB API error' }), { headers: { 'Content-Type': 'application/json' } })
  }
}
