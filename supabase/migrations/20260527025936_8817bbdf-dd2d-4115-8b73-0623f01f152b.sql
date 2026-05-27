INSERT INTO public.reseller_profiles (user_id, name, status)
SELECT u.id, split_part(u.email, '@', 1), 'pending'
FROM auth.users u
LEFT JOIN public.reseller_profiles rp ON rp.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE rp.id IS NULL
  AND ur.id IS NULL
  AND u.created_at > now() - interval '30 days'
  AND u.email IS NOT NULL;