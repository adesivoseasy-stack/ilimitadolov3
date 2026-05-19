DO $$
DECLARE
  _order_id uuid := '6d9e7a50-6e8e-4869-a3c3-f7f133f1bb6a';
  _reseller uuid;
  _key text;
  _license_id uuid;
BEGIN
  UPDATE public.credit_orders
  SET status = 'paid', paid_at = now()
  WHERE id = _order_id AND status <> 'paid'
  RETURNING reseller_id INTO _reseller;

  IF _reseller IS NULL THEN
    RAISE NOTICE 'Order already processed';
    RETURN;
  END IF;

  _key := public.generate_license_key();

  INSERT INTO public.licenses (license_key, email, expires_at, price, notes, created_by, status, is_wildcard)
  VALUES (_key, 'estoque', now() + interval '100 years', 0,
          'Chave em estoque - Pedido PIX #' || substring(_order_id::text, 1, 8) || ' (entrega manual)',
          _reseller, 'active', false)
  RETURNING id INTO _license_id;

  INSERT INTO public.license_logs (license_id, action, details)
  VALUES (_license_id, 'created', jsonb_build_object(
    'source', 'pix_purchase_manual_recovery',
    'order_id', _order_id,
    'created_by_reseller', _reseller
  ));
END $$;