
CREATE TABLE public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  blocked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.security_audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage audit logs" ON public.security_audit_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_security_audit_logs_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX idx_security_audit_logs_user ON public.security_audit_logs(user_id);
