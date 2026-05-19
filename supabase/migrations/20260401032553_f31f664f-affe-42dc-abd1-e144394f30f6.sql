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

  -- Auto-delete expired test licenses (max_messages IS NOT NULL)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired'
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired'
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired'
  );
  DELETE FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired';
END;
$function$;