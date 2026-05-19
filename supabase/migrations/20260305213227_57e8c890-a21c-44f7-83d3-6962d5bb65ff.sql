
-- Managers can update licenses
CREATE POLICY "Managers can update all licenses" ON public.licenses
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert licenses
CREATE POLICY "Managers can insert licenses" ON public.licenses
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete licenses
CREATE POLICY "Managers can delete licenses" ON public.licenses
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can view all devices
CREATE POLICY "Managers can view all devices" ON public.devices
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can update devices
CREATE POLICY "Managers can update devices" ON public.devices
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete devices
CREATE POLICY "Managers can delete devices" ON public.devices
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert devices
CREATE POLICY "Managers can insert devices" ON public.devices
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert license_logs
CREATE POLICY "Managers can insert logs" ON public.license_logs
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can view license_logs
CREATE POLICY "Managers can view all logs" ON public.license_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete reseller profiles
CREATE POLICY "Managers can delete reseller profiles" ON public.reseller_profiles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert roles
CREATE POLICY "Managers can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete roles
CREATE POLICY "Managers can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));
