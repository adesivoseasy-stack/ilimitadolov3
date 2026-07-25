
REVOKE EXECUTE ON FUNCTION public.recalc_reseller_progress(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.on_credit_order_paid() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_community_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_community_progress() TO authenticated;
