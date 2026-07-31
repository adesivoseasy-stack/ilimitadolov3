DO $$
DECLARE
  v_owner uuid := 'de73c8e4-1e7f-4581-87b5-f13975d99b1a';
  v_key text;
  v_id uuid;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i int;
BEGIN
  LOOP
    v_key := '';
    FOR i IN 1..20 LOOP
      v_key := v_key || substr(chars, 1 + floor(random()*length(chars))::int, 1);
      IF i IN (5,10,15) THEN v_key := v_key || '-'; END IF;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.licenses WHERE license_key = v_key);
  END LOOP;

  INSERT INTO public.licenses (license_key, email, status, expires_at, notes, price, duration_hours, created_by)
  VALUES (v_key, 'estoque', 'active', now() + interval '6 days', 'Chave 6 dias criada manualmente pelo admin para thiagorp2550@gmail.com', 0, 144, v_owner)
  RETURNING id INTO v_id;

  INSERT INTO public.license_logs (license_id, action, details)
  VALUES (v_id, 'created', jsonb_build_object('source','admin_manual','duration_days',6,'reseller_email','thiagorp2550@gmail.com','license_key',v_key));

  RAISE NOTICE 'created %', v_key;
END $$;