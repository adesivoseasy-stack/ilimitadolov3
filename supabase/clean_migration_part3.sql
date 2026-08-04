-- clean_migration_part3.sql
-- Contains RLS POLICIES, STORAGE BUCKETS, INITIAL DATA

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
CREATE POLICY "Managers can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can insert roles" ON public.user_roles;
CREATE POLICY "Managers can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can delete roles" ON public.user_roles;
CREATE POLICY "Managers can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Apollo can delete reseller roles" ON public.user_roles;
CREATE POLICY "Apollo can delete reseller roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND role = 'reseller'::app_role AND EXISTS (SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = user_roles.user_id AND reseller_profiles.created_by = auth.uid()));
DROP POLICY IF EXISTS "Only admins and managers can insert roles" ON public.user_roles;
CREATE POLICY "Only admins and managers can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Block self role assignment" ON public.user_roles;
CREATE POLICY "Block self role assignment" ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (user_id <> auth.uid());

-- licenses
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all licenses" ON public.licenses;
CREATE POLICY "Admins can view all licenses" ON public.licenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert licenses" ON public.licenses;
CREATE POLICY "Admins can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update licenses" ON public.licenses;
CREATE POLICY "Admins can update licenses" ON public.licenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete licenses" ON public.licenses;
CREATE POLICY "Admins can delete licenses" ON public.licenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can view all licenses" ON public.licenses;
CREATE POLICY "Managers can view all licenses" ON public.licenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can insert licenses" ON public.licenses;
CREATE POLICY "Managers can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can update all licenses" ON public.licenses;
CREATE POLICY "Managers can update all licenses" ON public.licenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can delete licenses" ON public.licenses;
CREATE POLICY "Managers can delete licenses" ON public.licenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Resellers can view own licenses" ON public.licenses;
CREATE POLICY "Resellers can view own licenses" ON public.licenses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Resellers can insert licenses" ON public.licenses;
CREATE POLICY "Resellers can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Resellers can update own licenses" ON public.licenses;
CREATE POLICY "Resellers can update own licenses" ON public.licenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Apollo can view own licenses" ON public.licenses;
CREATE POLICY "Apollo can view own licenses" ON public.licenses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Apollo can insert licenses" ON public.licenses;
CREATE POLICY "Apollo can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Apollo can update own licenses" ON public.licenses;
CREATE POLICY "Apollo can update own licenses" ON public.licenses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Apollo can delete own licenses" ON public.licenses;
CREATE POLICY "Apollo can delete own licenses" ON public.licenses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
GRANT SELECT, UPDATE ON public.licenses TO authenticated;

-- devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all devices" ON public.devices;
CREATE POLICY "Admins can view all devices" ON public.devices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert devices" ON public.devices;
CREATE POLICY "Admins can insert devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update devices" ON public.devices;
CREATE POLICY "Admins can update devices" ON public.devices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete devices" ON public.devices;
CREATE POLICY "Admins can delete devices" ON public.devices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can view all devices" ON public.devices;
CREATE POLICY "Managers can view all devices" ON public.devices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can insert devices" ON public.devices;
CREATE POLICY "Managers can insert devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can update devices" ON public.devices;
CREATE POLICY "Managers can update devices" ON public.devices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can delete devices" ON public.devices;
CREATE POLICY "Managers can delete devices" ON public.devices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Resellers can view own devices" ON public.devices;
CREATE POLICY "Resellers can view own devices" ON public.devices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()));
DROP POLICY IF EXISTS "Resellers can delete own devices" ON public.devices;
CREATE POLICY "Resellers can delete own devices" ON public.devices FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()));
DROP POLICY IF EXISTS "Apollo can view own devices" ON public.devices;
CREATE POLICY "Apollo can view own devices" ON public.devices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Apollo can insert own devices" ON public.devices;
CREATE POLICY "Apollo can insert own devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Apollo can update own devices" ON public.devices;
CREATE POLICY "Apollo can update own devices" ON public.devices FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Apollo can delete own devices" ON public.devices;
CREATE POLICY "Apollo can delete own devices" ON public.devices FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.sessions;
CREATE POLICY "Service role can manage sessions" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view sessions" ON public.sessions;
CREATE POLICY "Admins can view sessions" ON public.sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can view sessions" ON public.sessions;
CREATE POLICY "Managers can view sessions" ON public.sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Resellers can view own sessions" ON public.sessions;
CREATE POLICY "Resellers can view own sessions" ON public.sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = sessions.license_id AND licenses.created_by = auth.uid()));
DROP POLICY IF EXISTS "Apollo can view own sessions" ON public.sessions;
CREATE POLICY "Apollo can view own sessions" ON public.sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = sessions.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;
CREATE POLICY "Admins can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can delete sessions" ON public.sessions;
CREATE POLICY "Managers can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Resellers can delete own sessions" ON public.sessions;
CREATE POLICY "Resellers can delete own sessions" ON public.sessions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = sessions.license_id AND licenses.created_by = auth.uid()));
DROP POLICY IF EXISTS "Apollo can delete own sessions" ON public.sessions;
CREATE POLICY "Apollo can delete own sessions" ON public.sessions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = sessions.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- license_logs
ALTER TABLE public.license_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.license_logs;
CREATE POLICY "Admins can view all logs" ON public.license_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert logs" ON public.license_logs;
CREATE POLICY "Admins can insert logs" ON public.license_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can view all logs" ON public.license_logs;
CREATE POLICY "Managers can view all logs" ON public.license_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "Managers can insert logs" ON public.license_logs;
CREATE POLICY "Managers can insert logs" ON public.license_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));
DROP POLICY IF EXISTS "No one can update logs" ON public.license_logs;
CREATE POLICY "No one can update logs" ON public.license_logs FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "Resellers can view own license logs" ON public.license_logs;
CREATE POLICY "Resellers can view own license logs" ON public.license_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()));
DROP POLICY IF EXISTS "Resellers can insert own license logs" ON public.license_logs;
CREATE POLICY "Resellers can insert own license logs" ON public.license_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()));
DROP POLICY IF EXISTS "Apollo can view own license logs" ON public.license_logs;
CREATE POLICY "Apollo can view own license logs" ON public.license_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Apollo can insert own license logs" ON public.license_logs;
CREATE POLICY "Apollo can insert own license logs" ON public.license_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
DROP POLICY IF EXISTS "Admins can delete logs" ON public.license_logs;
CREATE POLICY "Admins can delete logs" ON public.license_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Managers can delete logs" ON public.license_logs;
CREATE POLICY "Managers can delete logs" ON public.license_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

-- STORAGE BUCKETS
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true) ON CONFLICT DO NOTHING;
  INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true) ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- INITIAL DATA
INSERT INTO public.system_config (key, value, description) VALUES
  ('n8n_webhook_url', 'https://primary-production-ca741.up.railway.app/webhook/lov2.0', 'URL do webhook n8n para processar mensagens da extensão'),
  ('creditos_pkg_10', '1.90', 'Preço pacote 10 créditos (página pública /creditos)'),
  ('creditos_pkg_50', '5.90', 'Preço pacote 50 créditos (página pública /creditos)'),
  ('creditos_pkg_100', '8.90', 'Preço pacote 100 créditos (página pública /creditos)'),
  ('creditos_pkg_200', '16.90', 'Preço pacote 200 créditos (página pública /creditos)'),
  ('creditos_pkg_300', '23.90', 'Preço pacote 300 créditos (página pública /creditos)'),
  ('creditos_pkg_500', '38.90', 'Preço pacote 500 créditos (página pública /creditos)'),
  ('creditos_pkg_1000', '74.90', 'Preço pacote 1000 créditos (página pública /creditos)'),
  ('creditos_pkg_2000', '143.90', 'Preço pacote 2000 créditos (página pública /creditos)'),
  ('creditos_pkg_3000', '209.90', 'Preço pacote 3000 créditos (página pública /creditos)'),
  ('creditos_pkg_5000', '339.90', 'Preço pacote 5000 créditos (página pública /creditos)'),
  ('reseller_key_tier_197_1_price', '49.90', 'Preço tier 1'),
  ('reseller_key_tier_197_2_price', '49.90', 'Preço tier 2'),
  ('reseller_key_tier_197_3_price', '49.90', 'Preço tier 3')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.community_discount_levels (name, emoji, sales_required, discount_percentage, order_index) VALUES
  ('Bronze',   '🥉', 10, 3,  1),
  ('Prata',    '🥈', 20, 5,  2),
  ('Ouro',     '🥇', 35, 8,  3),
  ('Platina',  '💎', 50, 12, 4),
  ('Diamante', '🔮', 75, 15, 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.community_discount_config (is_active) VALUES (true) ON CONFLICT DO NOTHING;
