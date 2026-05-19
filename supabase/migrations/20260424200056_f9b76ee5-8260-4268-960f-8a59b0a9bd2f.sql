-- Tabela para rastrear projetos Lovable únicos por licença
CREATE TABLE IF NOT EXISTS public.license_project_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (license_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_lpt_license_lastseen ON public.license_project_tracking(license_id, last_seen_at DESC);

ALTER TABLE public.license_project_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: admins/managers veem tudo, resellers veem só suas licenças, service_role gerencia
CREATE POLICY "Admins can view all project tracking"
  ON public.license_project_tracking FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all project tracking"
  ON public.license_project_tracking FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own project tracking"
  ON public.license_project_tracking FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licenses
    WHERE licenses.id = license_project_tracking.license_id
      AND licenses.created_by = auth.uid()
  ));

CREATE POLICY "Service role can manage project tracking"
  ON public.license_project_tracking FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Função: registra projeto e auto-revoga se exceder N projetos únicos em janela de tempo
CREATE OR REPLACE FUNCTION public.register_license_project(
  _license_id UUID,
  _project_id TEXT,
  _max_unique_projects INTEGER DEFAULT 2,
  _window_seconds INTEGER DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unique_projects INTEGER;
  _is_wildcard BOOLEAN;
  _current_status TEXT;
  _project_list TEXT[];
BEGIN
  -- Skip wildcard licenses (multi-tenant intencional)
  SELECT is_wildcard, status INTO _is_wildcard, _current_status
  FROM public.licenses WHERE id = _license_id;

  IF _is_wildcard THEN
    RETURN jsonb_build_object('revoked', false, 'reason', 'wildcard_skip');
  END IF;

  IF _current_status = 'revoked' THEN
    RETURN jsonb_build_object('revoked', true, 'reason', 'already_revoked');
  END IF;

  -- Upsert do projeto atual
  INSERT INTO public.license_project_tracking (license_id, project_id)
  VALUES (_license_id, _project_id)
  ON CONFLICT (license_id, project_id) DO UPDATE
    SET message_count = license_project_tracking.message_count + 1,
        last_seen_at = now();

  -- Conta projetos únicos na janela de tempo
  SELECT COUNT(DISTINCT project_id), array_agg(DISTINCT project_id)
  INTO _unique_projects, _project_list
  FROM public.license_project_tracking
  WHERE license_id = _license_id
    AND last_seen_at >= now() - (_window_seconds || ' seconds')::INTERVAL;

  IF _unique_projects > _max_unique_projects THEN
    UPDATE public.licenses
    SET status = 'revoked', revoked_at = now()
    WHERE id = _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (
      _license_id,
      'auto_revoked_project_abuse',
      jsonb_build_object(
        'unique_projects', _unique_projects,
        'limit', _max_unique_projects,
        'window_seconds', _window_seconds,
        'projects', _project_list,
        'triggered_by_project', _project_id
      )
    );

    RETURN jsonb_build_object(
      'revoked', true,
      'reason', 'project_abuse',
      'unique_projects', _unique_projects,
      'projects', _project_list
    );
  END IF;

  RETURN jsonb_build_object('revoked', false, 'unique_projects', _unique_projects);
END;
$$;