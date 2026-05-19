-- Tabela para rastrear IPs únicos que validam cada licença
CREATE TABLE public.license_ip_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  hwid TEXT,
  access_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(license_id, ip_address)
);

CREATE INDEX idx_license_ip_tracking_license ON public.license_ip_tracking(license_id);
CREATE INDEX idx_license_ip_tracking_last_seen ON public.license_ip_tracking(last_seen_at DESC);

ALTER TABLE public.license_ip_tracking ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "Admins can view all ip tracking"
ON public.license_ip_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Gerentes veem tudo
CREATE POLICY "Managers can view all ip tracking"
ON public.license_ip_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Revendedores veem só das próprias licenças
CREATE POLICY "Resellers can view own license ip tracking"
ON public.license_ip_tracking
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.licenses
  WHERE licenses.id = license_ip_tracking.license_id
    AND licenses.created_by = auth.uid()
));

-- Service role gerencia tudo
CREATE POLICY "Service role can manage ip tracking"
ON public.license_ip_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Função para registrar IP e detectar abuso
-- Retorna true se a licença foi revogada por abuso, false caso contrário
CREATE OR REPLACE FUNCTION public.register_license_ip(
  _license_id UUID,
  _ip_address TEXT,
  _user_agent TEXT DEFAULT NULL,
  _hwid TEXT DEFAULT NULL,
  _max_unique_ips INTEGER DEFAULT 1,
  _window_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unique_ips INTEGER;
  _is_wildcard BOOLEAN;
  _current_status TEXT;
  _ip_list TEXT[];
BEGIN
  -- Não rastrear IPs para licenças wildcard (são intencionalmente multi-IP)
  SELECT is_wildcard, status INTO _is_wildcard, _current_status
  FROM public.licenses WHERE id = _license_id;

  IF _is_wildcard THEN
    RETURN jsonb_build_object('revoked', false, 'reason', 'wildcard_skip');
  END IF;

  -- Se já estiver revogada, não fazer nada
  IF _current_status = 'revoked' THEN
    RETURN jsonb_build_object('revoked', true, 'reason', 'already_revoked');
  END IF;

  -- Upsert do IP atual
  INSERT INTO public.license_ip_tracking (license_id, ip_address, user_agent, hwid)
  VALUES (_license_id, _ip_address, _user_agent, _hwid)
  ON CONFLICT (license_id, ip_address) DO UPDATE
  SET access_count = license_ip_tracking.access_count + 1,
      last_seen_at = now(),
      user_agent = COALESCE(EXCLUDED.user_agent, license_ip_tracking.user_agent),
      hwid = COALESCE(EXCLUDED.hwid, license_ip_tracking.hwid);

  -- Contar IPs únicos na janela de tempo
  SELECT COUNT(DISTINCT ip_address), array_agg(DISTINCT ip_address)
  INTO _unique_ips, _ip_list
  FROM public.license_ip_tracking
  WHERE license_id = _license_id
    AND last_seen_at >= now() - (_window_hours || ' hours')::INTERVAL
    AND ip_address != 'unknown';

  -- Se exceder limite, revogar automaticamente
  IF _unique_ips > _max_unique_ips THEN
    UPDATE public.licenses
    SET status = 'revoked',
        revoked_at = now()
    WHERE id = _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (
      _license_id,
      'auto_revoked_ip_abuse',
      jsonb_build_object(
        'unique_ips', _unique_ips,
        'limit', _max_unique_ips,
        'window_hours', _window_hours,
        'ips', _ip_list,
        'triggered_by_ip', _ip_address
      )
    );

    RETURN jsonb_build_object(
      'revoked', true,
      'reason', 'ip_abuse',
      'unique_ips', _unique_ips,
      'ips', _ip_list
    );
  END IF;

  RETURN jsonb_build_object('revoked', false, 'unique_ips', _unique_ips);
END;
$$;