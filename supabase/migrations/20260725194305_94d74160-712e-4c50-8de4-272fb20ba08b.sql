
-- ============================================================
-- 1. LEVELS TABLE
-- ============================================================
CREATE TABLE public.community_discount_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏅',
  sales_required integer NOT NULL,
  discount_percentage numeric(5,2) NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_discount_levels TO authenticated;
GRANT ALL ON public.community_discount_levels TO service_role;

ALTER TABLE public.community_discount_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read levels"
  ON public.community_discount_levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage levels"
  ON public.community_discount_levels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_community_discount_levels_updated_at
  BEFORE UPDATE ON public.community_discount_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.community_discount_levels (name, emoji, sales_required, discount_percentage, order_index) VALUES
  ('Bronze',   '🥉', 10, 3,  1),
  ('Prata',    '🥈', 20, 5,  2),
  ('Ouro',     '🥇', 35, 8,  3),
  ('Platina',  '💎', 50, 12, 4),
  ('Diamante', '💠', 75, 15, 5);

-- ============================================================
-- 2. CONFIG TABLE (singleton)
-- ============================================================
CREATE TABLE public.community_discount_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_discount_config TO authenticated;
GRANT ALL ON public.community_discount_config TO service_role;

ALTER TABLE public.community_discount_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read config"
  ON public.community_discount_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage config"
  ON public.community_discount_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_community_discount_config_updated_at
  BEFORE UPDATE ON public.community_discount_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.community_discount_config (is_active) VALUES (true);

-- ============================================================
-- 3. RESELLER PROGRESS TABLE
-- ============================================================
CREATE TABLE public.reseller_community_progress (
  reseller_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_sales integer NOT NULL DEFAULT 0,
  current_level_id uuid REFERENCES public.community_discount_levels(id) ON DELETE SET NULL,
  current_discount numeric(5,2) NOT NULL DEFAULT 0,
  next_level_id uuid REFERENCES public.community_discount_levels(id) ON DELETE SET NULL,
  sales_to_next integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reseller_community_progress TO authenticated;
GRANT ALL ON public.reseller_community_progress TO service_role;

ALTER TABLE public.reseller_community_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own progress"
  ON public.reseller_community_progress FOR SELECT
  TO authenticated USING (reseller_id = auth.uid());

CREATE POLICY "Admins and managers view all progress"
  ON public.reseller_community_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers manage progress"
  ON public.reseller_community_progress FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_reseller_community_progress_updated_at
  BEFORE UPDATE ON public.reseller_community_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. RECALC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_reseller_progress(_reseller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_sales integer;
  _current_level RECORD;
  _next_level RECORD;
BEGIN
  IF _reseller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantity), 0)::int INTO _total_sales
  FROM public.credit_orders
  WHERE reseller_id = _reseller_id AND status = 'paid';

  -- Highest reached level (sales_required <= total)
  SELECT * INTO _current_level
  FROM public.community_discount_levels
  WHERE sales_required <= _total_sales
  ORDER BY order_index DESC
  LIMIT 1;

  -- Next locked level
  SELECT * INTO _next_level
  FROM public.community_discount_levels
  WHERE sales_required > _total_sales
  ORDER BY order_index ASC
  LIMIT 1;

  INSERT INTO public.reseller_community_progress (
    reseller_id, current_sales, current_level_id, current_discount, next_level_id, sales_to_next
  ) VALUES (
    _reseller_id,
    _total_sales,
    _current_level.id,
    COALESCE(_current_level.discount_percentage, 0),
    _next_level.id,
    CASE WHEN _next_level.id IS NOT NULL THEN _next_level.sales_required - _total_sales ELSE NULL END
  )
  ON CONFLICT (reseller_id) DO UPDATE SET
    current_sales = EXCLUDED.current_sales,
    current_level_id = EXCLUDED.current_level_id,
    current_discount = EXCLUDED.current_discount,
    next_level_id = EXCLUDED.next_level_id,
    sales_to_next = EXCLUDED.sales_to_next,
    updated_at = now();
END;
$$;

-- ============================================================
-- 5. TRIGGER ON credit_orders paid transitions
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_credit_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.recalc_reseller_progress(NEW.reseller_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER credit_order_paid_recalc_progress
  AFTER INSERT OR UPDATE ON public.credit_orders
  FOR EACH ROW EXECUTE FUNCTION public.on_credit_order_paid();

-- ============================================================
-- 6. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reseller_community_progress;
ALTER TABLE public.reseller_community_progress REPLICA IDENTITY FULL;

-- ============================================================
-- 7. BACKFILL
-- ============================================================
DO $$
DECLARE _r uuid;
BEGIN
  FOR _r IN SELECT DISTINCT reseller_id FROM public.credit_orders WHERE status = 'paid' AND reseller_id IS NOT NULL
  LOOP
    PERFORM public.recalc_reseller_progress(_r);
  END LOOP;
END $$;

-- ============================================================
-- 8. ADMIN RPC: reset all
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_community_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.reseller_community_progress
  SET current_sales = 0, current_level_id = NULL, current_discount = 0,
      next_level_id = (SELECT id FROM public.community_discount_levels ORDER BY order_index ASC LIMIT 1),
      sales_to_next = (SELECT sales_required FROM public.community_discount_levels ORDER BY order_index ASC LIMIT 1),
      updated_at = now();
END;
$$;
