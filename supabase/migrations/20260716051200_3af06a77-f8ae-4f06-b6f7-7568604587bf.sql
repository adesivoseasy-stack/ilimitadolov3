UPDATE public.reseller_profiles
SET status = 'approved', approved_at = now(), updated_at = now()
WHERE user_id = '1ee95cb5-3c28-4808-8d65-19ee805bd6aa';

INSERT INTO public.user_roles (user_id, role)
VALUES ('1ee95cb5-3c28-4808-8d65-19ee805bd6aa', 'reseller')
ON CONFLICT (user_id, role) DO NOTHING;