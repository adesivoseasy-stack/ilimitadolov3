-- Defense in depth: remove all privileges from the anon role on sensitive tables.
-- All access to these tables flows through edge functions (service_role) or
-- authenticated users (RLS-protected). The anon role should not be able to
-- enumerate or touch any of them.

REVOKE ALL ON public.sessions FROM anon;
REVOKE ALL ON public.devices FROM anon;
REVOKE ALL ON public.licenses FROM anon;
REVOKE ALL ON public.license_logs FROM anon;
REVOKE ALL ON public.license_ip_tracking FROM anon;
REVOKE ALL ON public.license_project_tracking FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.reseller_profiles FROM anon;
REVOKE ALL ON public.reseller_credits FROM anon;
REVOKE ALL ON public.credit_orders FROM anon;
REVOKE ALL ON public.credits_customers FROM anon;
REVOKE ALL ON public.lvb_credit_orders FROM anon;
REVOKE ALL ON public.token_pool FROM anon;
REVOKE ALL ON public.token_refresh_logs FROM anon;
REVOKE ALL ON public.token_metrics FROM anon;
REVOKE ALL ON public.security_audit_logs FROM anon;
REVOKE ALL ON public.wildcard_usage FROM anon;
REVOKE ALL ON public.test_license_ips FROM anon;
REVOKE ALL ON public.telegram_bot_states FROM anon;
REVOKE ALL ON public.system_config FROM anon;
REVOKE ALL ON public.templates FROM anon;
REVOKE ALL ON public.apollo_hoopay_config FROM anon;
REVOKE ALL ON public.apollo_syncpay_config FROM anon;

-- Also remove INSERT/UPDATE/DELETE from authenticated on tables where no policy
-- ever allows authenticated writes directly (writes go through edge functions
-- using the service_role). RLS already blocks these, but stripping the grant
-- means the scanner won't even see the table as writable.
REVOKE INSERT, UPDATE, DELETE ON public.token_pool FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.token_refresh_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.token_metrics FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.security_audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.test_license_ips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.telegram_bot_states FROM authenticated;
REVOKE ALL ON public.telegram_bot_states FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.license_ip_tracking FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.license_project_tracking FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wildcard_usage FROM authenticated;
