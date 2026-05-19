
CREATE TABLE public.credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL,
  quantity integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pagseguro_order_id text,
  qr_code_text text,
  qr_code_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own orders"
ON public.credit_orders FOR SELECT
TO authenticated
USING (reseller_id = auth.uid());

CREATE POLICY "Admins can manage credit orders"
ON public.credit_orders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage credit orders"
ON public.credit_orders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Service role can manage credit orders"
ON public.credit_orders FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_credit_orders_updated_at
  BEFORE UPDATE ON public.credit_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
