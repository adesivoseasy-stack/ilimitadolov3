INSERT INTO public.reseller_profiles (user_id, name, status)
SELECT u.id, COALESCE(split_part(u.email, '@', 1), 'Revendedor'), 'pending'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.reseller_profiles rp WHERE rp.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
  AND u.created_at > now() - interval '30 days'
ON CONFLICT (user_id) DO NOTHING;