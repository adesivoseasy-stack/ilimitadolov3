
-- Add created_by column to reseller_profiles
ALTER TABLE public.reseller_profiles ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Apollo can SELECT reseller_profiles they created
CREATE POLICY "Apollo can view own reseller profiles"
ON public.reseller_profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- Apollo can UPDATE reseller_profiles they created
CREATE POLICY "Apollo can update own reseller profiles"
ON public.reseller_profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- Apollo can DELETE reseller_profiles they created
CREATE POLICY "Apollo can delete own reseller profiles"
ON public.reseller_profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- Apollo can manage reseller_credits for their resellers
CREATE POLICY "Apollo can manage own reseller credits"
ON public.reseller_credits FOR ALL TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND EXISTS (
  SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = reseller_credits.reseller_id AND reseller_profiles.created_by = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'apollo'::app_role) AND EXISTS (
  SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = reseller_credits.reseller_id AND reseller_profiles.created_by = auth.uid()
));

-- Apollo can manage user_roles for resellers they created
CREATE POLICY "Apollo can delete reseller roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND role = 'reseller'::app_role AND EXISTS (
  SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = user_roles.user_id AND reseller_profiles.created_by = auth.uid()
));
