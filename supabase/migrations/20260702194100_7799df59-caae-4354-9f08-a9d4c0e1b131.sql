-- Perf: RPC agregada para listagem de revendedores no painel admin.
-- Retorna profiles + licenseCount + credits + paidKeys em uma única chamada,
-- eliminando 4 round-trips paralelos.
CREATE OR REPLACE FUNCTION public.admin_list_resellers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH lic AS (
    SELECT created_by, count(*) FILTER (WHERE max_messages IS NULL) AS license_count
    FROM public.licenses
    WHERE created_by IS NOT NULL
    GROUP BY created_by
  ),
  cred AS (
    SELECT reseller_id, credits_total, credits_used
    FROM public.reseller_credits
  ),
  paid AS (
    SELECT reseller_id, SUM(quantity)::int AS paid_keys
    FROM public.credit_orders
    WHERE status = 'paid'
    GROUP BY reseller_id
  )
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      to_jsonb(rp) || jsonb_build_object(
        'licenseCount', COALESCE(lic.license_count, 0),
        'credits_total', COALESCE(cred.credits_total, 0),
        'credits_used', COALESCE(cred.credits_used, 0),
        'paidKeys', COALESCE(paid.paid_keys, 0)
      ) AS r
    FROM public.reseller_profiles rp
    LEFT JOIN lic  ON lic.created_by  = rp.user_id
    LEFT JOIN cred ON cred.reseller_id = rp.user_id
    LEFT JOIN paid ON paid.reseller_id = rp.user_id
  ) t;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_resellers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_resellers() TO authenticated;

-- Índice de apoio
CREATE INDEX IF NOT EXISTS idx_credit_orders_reseller_status ON public.credit_orders (reseller_id, status);