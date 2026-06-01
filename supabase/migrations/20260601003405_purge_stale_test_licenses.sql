-- 1) Purge stale unused test licenses immediately
WITH stale AS (
  SELECT id FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours'
)
DELETE FROM public.license_logs WHERE license_id IN (SELECT id FROM stale);

DELETE FROM public.sessions WHERE license_id IN (
  SELECT id FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours'
);

DELETE FROM public.devices WHERE license_id IN (
  SELECT id FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours'
);

DELETE FROM public.licenses
WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
  AND first_activated_at IS NULL
  AND created_at < now() - interval '24 hours';

-- 2) Extend update_expired_licenses to also purge unused test keys older than 24h
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

  -- Auto-delete expired test licenses
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

  -- Auto-delete UNACTIVATED test keys older than 24h (anti-stockpile)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours';
END;
$function$;
