UPDATE public.licenses
SET
  duration_hours = 720,
  first_activated_at = NULL,
  expires_at = now() + interval '100 years'
WHERE email = 'estoque'
  AND COALESCE(is_wildcard, false) = false
  AND first_activated_at IS NULL
  AND (
    duration_hours IS NULL
    OR duration_hours <> 720
    OR expires_at < now() + interval '50 years'
  );