
-- Table to store Apollo admin's HooPay credentials for split payments
CREATE TABLE public.apollo_hoopay_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  hoopay_username text NOT NULL DEFAULT '',
  hoopay_password text NOT NULL DEFAULT '',
  organization_uuid text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apollo_hoopay_config ENABLE ROW LEVEL SECURITY;

-- Apollo admins can manage their own config
CREATE POLICY "Apollo can view own hoopay config" ON public.apollo_hoopay_config
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

CREATE POLICY "Apollo can insert own hoopay config" ON public.apollo_hoopay_config
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

CREATE POLICY "Apollo can update own hoopay config" ON public.apollo_hoopay_config
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Admins can view all configs
CREATE POLICY "Admins can view all hoopay config" ON public.apollo_hoopay_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "Service role can manage hoopay config" ON public.apollo_hoopay_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
