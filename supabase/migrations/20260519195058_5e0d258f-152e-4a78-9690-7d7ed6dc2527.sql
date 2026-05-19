DO $$
DECLARE
  _order_id uuid;
  _reseller uuid;
  _key text;
  _license_id uuid;
  _ids uuid[] := ARRAY['9c523b81-0a79-430c-972c-cca7a58590ed','535d4236-a712-4e77-a083-4d044e94d2c3']::uuid[];
BEGIN
  FOREACH _order_id IN ARRAY _ids LOOP
    UPDATE public.credit_orders
    SET status = 'paid', paid_at = now()
    WHERE id = _order_id AND status <> 'paid'
    RETURNING reseller_id INTO _reseller;

    IF _reseller IS NULL THEN CONTINUE; END IF;

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
  END LOOP;
END $$;