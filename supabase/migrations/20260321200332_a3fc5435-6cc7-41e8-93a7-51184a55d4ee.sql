
-- Allow admins and managers to delete sessions (needed for device reset)
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;
DROP POLICY IF EXISTS "Managers can delete sessions" ON public.sessions;
CREATE POLICY "Admins can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow admins and managers to delete license_logs (needed for license deletion)
DROP POLICY IF EXISTS "No one can delete logs" ON public.license_logs;
DROP POLICY IF EXISTS "Admins can delete logs" ON public.license_logs;
DROP POLICY IF EXISTS "Managers can delete logs" ON public.license_logs;
CREATE POLICY "Admins can delete logs" ON public.license_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can delete logs" ON public.license_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
