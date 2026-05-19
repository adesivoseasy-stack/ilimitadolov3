CREATE POLICY "Resellers can view lvb package prices"
ON public.system_config
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'reseller'::app_role) AND key LIKE 'lvb_package_%'
);