
CREATE TABLE public.lvb_credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL,
  external_order_id text,
  creditos integer NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  link_cliente text,
  email_bot text,
  workspace_id text,
  workspace_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lvb_credit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own lvb orders"
  ON public.lvb_credit_orders FOR SELECT TO authenticated
  USING (reseller_id = auth.uid());

CREATE POLICY "Resellers can insert own lvb orders"
  ON public.lvb_credit_orders FOR INSERT TO authenticated
  WITH CHECK (reseller_id = auth.uid());

CREATE POLICY "Resellers can update own lvb orders"
  ON public.lvb_credit_orders FOR UPDATE TO authenticated
  USING (reseller_id = auth.uid());

CREATE POLICY "Admins can manage all lvb orders"
  ON public.lvb_credit_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all lvb orders"
  ON public.lvb_credit_orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));
