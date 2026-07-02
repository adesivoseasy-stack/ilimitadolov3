-- Perf: índices faltantes usados pelo painel admin
CREATE INDEX IF NOT EXISTS idx_devices_activated_at ON public.devices (activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_license_id ON public.devices (license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON public.licenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_created_by ON public.licenses (created_by);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses (status);

-- RPC otimizada para admin/manager: uma query só, sem overhead de RLS por linha.
CREATE OR REPLACE FUNCTION public.admin_list_licenses()
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

  SELECT COALESCE(jsonb_agg(row_to_json(l_with_devices) ORDER BY (l_with_devices->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT to_jsonb(l) || jsonb_build_object(
      'devices', COALESCE(
        (SELECT jsonb_agg(to_jsonb(d)) FROM public.devices d WHERE d.license_id = l.id),
        '[]'::jsonb
      )
    ) AS l_with_devices
    FROM public.licenses l
  ) t;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_licenses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_licenses() TO authenticated;