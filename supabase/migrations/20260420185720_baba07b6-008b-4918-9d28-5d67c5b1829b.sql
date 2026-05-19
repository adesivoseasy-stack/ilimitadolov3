-- Tabela credits_customers
CREATE TABLE IF NOT EXISTS public.credits_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credits_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits customer profile"
  ON public.credits_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits customer profile"
  ON public.credits_customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits customer profile"
  ON public.credits_customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits customers"
  ON public.credits_customers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all credits customers"
  ON public.credits_customers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_credits_customers_updated_at
  BEFORE UPDATE ON public.credits_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna source em lvb_credit_orders
ALTER TABLE public.lvb_credit_orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'reseller_panel';

CREATE INDEX IF NOT EXISTS idx_lvb_credit_orders_source ON public.lvb_credit_orders(source);

-- Políticas para credits_customer em lvb_credit_orders
CREATE POLICY "Credits customers can insert own lvb orders"
  ON public.lvb_credit_orders FOR INSERT
  TO authenticated
  WITH CHECK (reseller_id = auth.uid() AND public.has_role(auth.uid(), 'credits_customer'::app_role));

CREATE POLICY "Credits customers can view own lvb orders"
  ON public.lvb_credit_orders FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid() AND public.has_role(auth.uid(), 'credits_customer'::app_role));

CREATE POLICY "Credits customers can update own lvb orders"
  ON public.lvb_credit_orders FOR UPDATE
  TO authenticated
  USING (reseller_id = auth.uid() AND public.has_role(auth.uid(), 'credits_customer'::app_role));

-- Política para leitura de preços creditos_pkg_*
CREATE POLICY "Credits customers can view creditos package prices"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'credits_customer'::app_role) AND key LIKE 'creditos_pkg_%');

-- Seed dos preços padrão
INSERT INTO public.system_config (key, value, description) VALUES
  ('creditos_pkg_10', '1.90', 'Preço pacote 10 créditos (página pública /creditos)'),
  ('creditos_pkg_50', '5.90', 'Preço pacote 50 créditos (página pública /creditos)'),
  ('creditos_pkg_100', '8.90', 'Preço pacote 100 créditos (página pública /creditos)'),
  ('creditos_pkg_200', '16.90', 'Preço pacote 200 créditos (página pública /creditos)'),
  ('creditos_pkg_300', '23.90', 'Preço pacote 300 créditos (página pública /creditos)'),
  ('creditos_pkg_500', '38.90', 'Preço pacote 500 créditos (página pública /creditos)'),
  ('creditos_pkg_1000', '74.90', 'Preço pacote 1000 créditos (página pública /creditos)'),
  ('creditos_pkg_2000', '143.90', 'Preço pacote 2000 créditos (página pública /creditos)'),
  ('creditos_pkg_3000', '209.90', 'Preço pacote 3000 créditos (página pública /creditos)'),
  ('creditos_pkg_5000', '339.90', 'Preço pacote 5000 créditos (página pública /creditos)')
ON CONFLICT (key) DO NOTHING;