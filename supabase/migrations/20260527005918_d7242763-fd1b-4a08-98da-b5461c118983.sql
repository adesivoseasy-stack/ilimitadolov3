UPDATE public.licenses
SET is_wildcard = true,
    duration_hours = 876000,
    expires_at = now() + interval '100 years',
    status = 'active',
    revoked_at = NULL,
    max_messages = NULL
WHERE license_key = 'VKT6F-R6TNU-8DVRL-9M6NL';