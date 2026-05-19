
-- Fix RLS policies on reseller_profiles: change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Admins can update reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Admins can delete reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Managers can view all reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Managers can update reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Managers can delete reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Resellers can view own profile" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Users can insert own reseller profile" ON public.reseller_profiles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can view all reseller profiles" ON public.reseller_profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reseller profiles" ON public.reseller_profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reseller profiles" ON public.reseller_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all reseller profiles" ON public.reseller_profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update reseller profiles" ON public.reseller_profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete reseller profiles" ON public.reseller_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own profile" ON public.reseller_profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reseller profile" ON public.reseller_profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix same issue on user_roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix licenses table
DROP POLICY IF EXISTS "Admins can view all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can delete licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can view all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can update all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can delete licenses" ON public.licenses;
DROP POLICY IF EXISTS "Resellers can view own licenses" ON public.licenses;
DROP POLICY IF EXISTS "Resellers can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Resellers can update own licenses" ON public.licenses;

CREATE POLICY "Admins can view all licenses" ON public.licenses
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert licenses" ON public.licenses
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update licenses" ON public.licenses
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete licenses" ON public.licenses
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all licenses" ON public.licenses
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert licenses" ON public.licenses
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update all licenses" ON public.licenses
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete licenses" ON public.licenses
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own licenses" ON public.licenses
FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Resellers can insert licenses" ON public.licenses
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());

CREATE POLICY "Resellers can update own licenses" ON public.licenses
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());

-- Fix devices table
DROP POLICY IF EXISTS "Admins can view all devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can insert devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can update devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can delete devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can view all devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can insert devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can update devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can delete devices" ON public.devices;
DROP POLICY IF EXISTS "Resellers can view own devices" ON public.devices;

CREATE POLICY "Admins can view all devices" ON public.devices
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert devices" ON public.devices
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update devices" ON public.devices
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete devices" ON public.devices
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all devices" ON public.devices
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert devices" ON public.devices
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update devices" ON public.devices
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete devices" ON public.devices
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own devices" ON public.devices
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()));

-- Fix license_logs table
DROP POLICY IF EXISTS "Admins can view all logs" ON public.license_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.license_logs;
DROP POLICY IF EXISTS "Managers can view all logs" ON public.license_logs;
DROP POLICY IF EXISTS "Managers can insert logs" ON public.license_logs;
DROP POLICY IF EXISTS "No one can delete logs" ON public.license_logs;
DROP POLICY IF EXISTS "No one can update logs" ON public.license_logs;
DROP POLICY IF EXISTS "Resellers can view own license logs" ON public.license_logs;
DROP POLICY IF EXISTS "Resellers can insert own license logs" ON public.license_logs;

CREATE POLICY "Admins can view all logs" ON public.license_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs" ON public.license_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all logs" ON public.license_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert logs" ON public.license_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "No one can delete logs" ON public.license_logs
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No one can update logs" ON public.license_logs
FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Resellers can view own license logs" ON public.license_logs
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()));

CREATE POLICY "Resellers can insert own license logs" ON public.license_logs
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()));

-- Fix reseller_credits table
DROP POLICY IF EXISTS "Admins can manage reseller credits" ON public.reseller_credits;
DROP POLICY IF EXISTS "Managers can manage reseller credits" ON public.reseller_credits;
DROP POLICY IF EXISTS "Resellers can view own credits" ON public.reseller_credits;

CREATE POLICY "Admins can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own credits" ON public.reseller_credits
FOR SELECT TO authenticated USING (reseller_id = auth.uid());
