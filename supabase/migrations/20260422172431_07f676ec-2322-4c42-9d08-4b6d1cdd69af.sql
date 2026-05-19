DROP TABLE IF EXISTS public._tmp_diag_user;
CREATE TABLE public._tmp_diag_user AS
SELECT 
  u.id, 
  u.email, 
  u.created_at, 
  (u.email_confirmed_at IS NOT NULL) as confirmed,
  u.raw_app_meta_data->>'provider' as provider,
  (SELECT string_agg(role::text, ',') FROM public.user_roles WHERE user_id = u.id) as roles,
  EXISTS(SELECT 1 FROM public.reseller_profiles WHERE user_id = u.id) as has_profile
FROM auth.users u
WHERE u.email ILIKE '%resendedf%' OR u.email ILIKE '%matheus_resende%' OR u.email ILIKE '%resende_df%'
ORDER BY u.created_at DESC;

-- RLS para evitar warnings: apenas admin pode ver
ALTER TABLE public._tmp_diag_user ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_admin_only" ON public._tmp_diag_user FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));