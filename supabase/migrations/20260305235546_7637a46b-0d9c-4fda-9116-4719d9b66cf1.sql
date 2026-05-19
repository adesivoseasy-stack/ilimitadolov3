
-- Allow managers to read/update system_config
CREATE POLICY "Managers can view config"
ON public.system_config FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update config"
ON public.system_config FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert config"
ON public.system_config FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete config"
ON public.system_config FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow resellers to read pricing config (keys starting with 'reseller_')
CREATE POLICY "Resellers can view reseller config"
ON public.system_config FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'reseller'::app_role)
  AND key LIKE 'reseller_%'
);
