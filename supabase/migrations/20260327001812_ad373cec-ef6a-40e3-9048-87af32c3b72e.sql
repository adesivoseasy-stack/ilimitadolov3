-- 1. Fix CRITICAL: reseller_profiles self-insert allows setting admin-only fields
DROP POLICY IF EXISTS "Users can insert own reseller profile" ON public.reseller_profiles;

CREATE POLICY "Users can insert own reseller profile"
ON public.reseller_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND custom_key_price IS NULL
  AND created_by IS NULL
);

-- 2. Fix WARN: Resellers can view licenses without role check
DROP POLICY IF EXISTS "Resellers can view own licenses" ON public.licenses;

CREATE POLICY "Resellers can view own licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'reseller'::app_role)
  AND created_by = auth.uid()
);