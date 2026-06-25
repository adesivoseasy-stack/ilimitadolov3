DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email='guilherme.amorimcrm@gmail.com' LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  UPDATE public.licenses SET created_by = _uid, email = 'guilherme.amorimcrm@gmail.com' WHERE license_key='NNCV0-Q039W-DFSOL-S1D8X';
END $$;