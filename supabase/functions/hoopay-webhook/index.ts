import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

// Legacy HooPay webhook - redirects to syncpay-webhook for any pending orders
// Keep alive temporarily to handle in-flight payments during migration
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[hoopay-webhook] DEPRECATED - Received webhook, forwarding logic...')

    const orderUUID = body.orderUUID || body.order_uuid || body.id
    const paymentStatus = body.payment?.status || body.status

    if (!orderUUID) {
      return new Response(JSON.stringify({ error: 'Missing orderUUID' }), { status: 400, headers: corsHeaders })
    }

    if (paymentStatus !== 'paid' && paymentStatus !== 'PAID') {
      return new Response(JSON.stringify({ ok: true, message: 'Not paid yet' }), { headers: corsHeaders })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check LVB credit orders
    const { data: lvbOrder } = await adminClient
      .from('lvb_credit_orders')
      .select('*')
      .eq('payment_order_id', orderUUID)
      .single()

    if (lvbOrder) {
      if (['paid', 'configurando', 'sucesso'].includes(lvbOrder.status)) {
        return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), { headers: corsHeaders })
      }
      await adminClient.from('lvb_credit_orders').update({ status: 'paid' }).eq('id', lvbOrder.id)
      return new Response(JSON.stringify({ ok: true, message: 'Legacy webhook - marked as paid' }), { headers: corsHeaders })
    }

    // Check regular credit orders
    const { data: order } = await adminClient
      .from('credit_orders')
      .select('*')
      .eq('pagseguro_order_id', orderUUID)
      .single()

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    if (order.status === 'paid') {
      return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), { headers: corsHeaders })
    }

    // Validate amount
    const webhookAmount = body.payment?.amount || body.amount
    if (webhookAmount != null) {
      const webhookCents = Math.round(parseFloat(webhookAmount) * 100)
      if (webhookCents !== order.amount_cents) {
        return new Response(JSON.stringify({ error: 'Amount mismatch' }), { status: 403, headers: corsHeaders })
      }
    }

    await adminClient.from('credit_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', order.id)

    // Generate keys
    const generatedKeys: string[] = []

    // Somente produtos de chave geram licenças (contas/créditos são entregues manualmente)
    const KEY_PRODUCTS = ['standard', 'lifetime', 'combo_champion']
    if (!KEY_PRODUCTS.includes(order.product_type)) {
      return new Response(
        JSON.stringify({ ok: true, keys_generated: 0, product_type: order.product_type, manual_delivery: true }),
        { headers: corsHeaders },
      )
    }

    for (let i = 0; i < order.quantity; i++) {
      const { data: keyData, error: keyError } = await adminClient.rpc('generate_license_key')
      if (keyError) continue

      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 100)

      const { data: license, error: insertError } = await adminClient
        .from('licenses')
        .insert({
          license_key: keyData, email: 'estoque', expires_at: farFuture.toISOString(),
          price: 0, notes: `Chave em estoque - Pedido PIX #${order.id.slice(0, 8)}`,
          created_by: order.reseller_id, status: 'active', is_wildcard: false,
          duration_hours: 720, first_activated_at: null,
        })
        .select('id').single()

      if (insertError) continue
      generatedKeys.push(keyData)
      await adminClient.from('license_logs').insert({
        license_id: license.id, action: 'created',
        details: { source: 'pix_purchase', order_id: order.id, created_by_reseller: order.reseller_id },
      })
    }

    console.log('[hoopay-webhook] LEGACY: Generated', generatedKeys.length, 'keys')
    return new Response(JSON.stringify({ ok: true, keys_generated: generatedKeys.length }), { headers: corsHeaders })
  } catch (err) {
    console.error('[hoopay-webhook] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
})
