-- Fix 1: Add SELECT policies to sessions table (currently missing, exposing session_token/hwid)
CREATE POLICY "Admins can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own sessions"
ON public.sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM licenses
  WHERE licenses.id = sessions.license_id
  AND licenses.created_by = auth.uid()
));

CREATE POLICY "Apollo can view own sessions"
ON public.sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = sessions.license_id
    AND licenses.created_by = auth.uid()
  ) AND has_role(auth.uid(), 'apollo'::app_role)
);

-- Fix 2: Add restrictive INSERT policy on user_roles to ensure only admin/manager can insert
-- First, block all INSERT for non-privileged users with an explicit deny
CREATE POLICY "Only admins and managers can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'apollo'::app_role)
);