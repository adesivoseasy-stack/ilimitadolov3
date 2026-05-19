CREATE TABLE public.token_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  function_name text DEFAULT 'unknown',
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL
);

ALTER TABLE public.token_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage token_metrics" ON public.token_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view token_metrics" ON public.token_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view token_metrics" ON public.token_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_token_metrics_created_at ON public.token_metrics(created_at DESC);
CREATE INDEX idx_token_metrics_provider ON public.token_metrics(provider);