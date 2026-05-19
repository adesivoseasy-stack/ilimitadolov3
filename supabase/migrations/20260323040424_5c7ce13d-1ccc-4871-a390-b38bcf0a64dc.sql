
-- RLS policies for apollo on licenses (only see their own created licenses)
CREATE POLICY "Apollo can view own licenses" ON public.licenses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
CREATE POLICY "Apollo can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
CREATE POLICY "Apollo can update own licenses" ON public.licenses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
CREATE POLICY "Apollo can delete own licenses" ON public.licenses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- RLS for devices
CREATE POLICY "Apollo can view own devices" ON public.devices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can insert own devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can update own devices" ON public.devices FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can delete own devices" ON public.devices FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- RLS for sessions
CREATE POLICY "Apollo can delete own sessions" ON public.sessions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = sessions.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- RLS for license_logs
CREATE POLICY "Apollo can view own license logs" ON public.license_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can insert own license logs" ON public.license_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- RLS for system_config, templates, wildcard_usage, token_metrics
CREATE POLICY "Apollo can view config" ON public.system_config FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can view templates" ON public.templates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can view own wildcard usage" ON public.wildcard_usage FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = wildcard_usage.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can view own token metrics" ON public.token_metrics FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND (license_id IS NULL OR EXISTS (SELECT 1 FROM licenses WHERE licenses.id = token_metrics.license_id AND licenses.created_by = auth.uid())));
