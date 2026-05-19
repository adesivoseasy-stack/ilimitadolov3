CREATE TABLE public.token_refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.token_pool(id) ON DELETE CASCADE,
  account_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'success',
  error_message text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view refresh logs" ON public.token_refresh_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage refresh logs" ON public.token_refresh_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_token_refresh_logs_created ON public.token_refresh_logs(created_at DESC);
CREATE INDEX idx_token_refresh_logs_status ON public.token_refresh_logs(status);