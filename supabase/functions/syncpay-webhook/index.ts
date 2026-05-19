import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

const COMPLETED_STATUSES = new Set(['completed', 'completo', 'paid', 'paid_out', 'approved', 'success', 'succeeded'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[syncpay-webhook] Received webhook payload:', JSON.stringify(body))

    // SyncPay sends { data: { id, amount, status, ... } }
    const webhookData = body.data || body
    const identifier = webhookData.id || webhookData.idtransaction || ''
    const status = (webhookData.status || '').toLowerCase()

    if (!identifier) {
      return new Response(JSON.stringify({ error: 'Missing identifier' }), { status: 400, headers: corsHeaders })
    }

    // SyncPay may send several successful statuses depending on the flow
    if (!COMPLETED_STATUSES.has(status)) {
      console.log('[syncpay-webhook] Not completed yet, status:', status)
      return new Response(JSON.stringify({ ok: true, message: 'Not completed yet' }), { headers: corsHeaders })
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
      return await handleLvbOrder(adminClient, lvbOrder, webhookData)
    }

    // Otherwise, handle as regular credit order
    const { data: order, error: orderError } = await adminClient
      .from('credit_orders')
      .select('*')
      .eq('pagseguro_order_id', identifier)
      .single()

    if (orderError || !order) {
      console.error('[syncpay-webhook] Order not found:', identifier, orderError)
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    // ATOMIC: Only update if status is NOT already 'paid' — prevents race condition
    // If multiple webhooks arrive simultaneously, only one will succeed here
    const { data: claimedOrder, error: claimError } = await adminClient
      .from('credit_orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id)
      .neq('status', 'paid')
      .select()
      .single()

    if (claimError || !claimedOrder) {
      console.log('[syncpay-webhook] Order already paid (race avoided):', order.id)
      return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), { headers: corsHeaders })
    }

    // Validate amount matches (SyncPay sends amount in reais as integer or float)
    const webhookAmount = webhookData.amount
    if (webhookAmount != null) {
      const webhookCents = Math.round(parseFloat(webhookAmount) * 100)
      if (webhookCents !== order.amount_cents) {
        console.error('[syncpay-webhook] Amount mismatch! Webhook:', webhookCents, 'DB:', order.amount_cents)
        // Revert status since amount doesn't match
        await adminClient
          .from('credit_orders')
          .update({ status: 'pending', paid_at: null })
          .eq('id', order.id)
        return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 403, headers: corsHeaders })
      }
      console.log('[syncpay-webhook] Amount validated:', webhookCents, '===', order.amount_cents)
    }

    // Generate license keys and add to reseller's stock
    const generatedKeys: string[] = []
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
          notes: `Chave em estoque - Pedido PIX #${order.id.slice(0, 8)}`,
          created_by: order.reseller_id,
          status: 'active',
          is_wildcard: false,
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
    console.error('[syncpay-webhook] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
})

async function handleLvbOrder(adminClient: any, lvbOrder: any, webhookData: any) {
  console.log('[syncpay-webhook] Processing LVB order:', lvbOrder.id)

  // ATOMIC: Only claim if not already processed — prevents race condition
  const { data: claimedLvb, error: claimLvbError } = await adminClient
    .from('lvb_credit_orders')
    .update({ status: 'paid' })
    .eq('id', lvbOrder.id)
    .not('status', 'in', '("paid","configurando","sucesso")')
    .select()
    .single()

  if (claimLvbError || !claimedLvb) {
    console.log('[syncpay-webhook] LVB order already processed (race avoided):', lvbOrder.id)
    return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Validate amount
  const webhookAmount = webhookData.amount
  if (webhookAmount != null) {
    const webhookCents = Math.round(parseFloat(webhookAmount) * 100)
    if (webhookCents !== lvbOrder.amount_cents) {
      console.error('[syncpay-webhook] LVB amount mismatch! Webhook:', webhookCents, 'DB:', lvbOrder.amount_cents)
      await adminClient.from('lvb_credit_orders').update({ status: 'aguardando' }).eq('id', lvbOrder.id)
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
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
