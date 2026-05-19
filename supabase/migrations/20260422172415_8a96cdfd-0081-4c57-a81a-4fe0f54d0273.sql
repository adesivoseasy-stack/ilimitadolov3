-- Diagnóstico: localizar cadastro do matheus_resendedf e copiar resultado para um log temporário
DO $$
DECLARE
  rec RECORD;
  result_text TEXT := '';
BEGIN
  FOR rec IN 
    SELECT 
      u.id, 
      u.email, 
      u.created_at, 
      u.email_confirmed_at IS NOT NULL as confirmed,
      u.raw_app_meta_data->>'provider' as provider,
      (SELECT string_agg(role::text, ',') FROM public.user_roles WHERE user_id = u.id) as roles,
      EXISTS(SELECT 1 FROM public.reseller_profiles WHERE user_id = u.id) as has_profile
    FROM auth.users u
    WHERE u.email ILIKE '%resendedf%' OR u.email ILIKE '%matheus_resende%'
    ORDER BY u.created_at DESC
  LOOP
    result_text := result_text || format(
      'EMAIL=%s | ID=%s | created=%s | confirmed=%s | provider=%s | roles=%s | profile=%s; ',
      rec.email, rec.id, rec.created_at, rec.confirmed, COALESCE(rec.provider, 'email'), COALESCE(rec.roles, 'NONE'), rec.has_profile
    );
  END LOOP;
  
  IF result_text = '' THEN
    RAISE NOTICE 'NENHUM USUÁRIO ENCONTRADO com email contendo resendedf ou matheus_resende';
  ELSE
    RAISE NOTICE 'RESULTADO: %', result_text;
  END IF;
END $$;