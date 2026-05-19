CREATE OR REPLACE FUNCTION public.update_expired_licenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark active licenses as expired
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  -- Auto-delete expired test licenses:
  -- 1. TESTE- prefix keys
  -- 2. duration_hours <= 0.17 (10 min)
  -- 3. max_messages IS NOT NULL (legacy)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.licenses WHERE status = 'expired' AND (
    license_key LIKE 'TESTE-%' OR
    max_messages IS NOT NULL OR 
    (duration_hours IS NOT NULL AND duration_hours <= 0.17)
  );
END;
$function$;