-- Fix reseller_credits RLS policies
-- RLS was enabled but no policies existed, blocking everything

CREATE POLICY admin_credits_all ON public.reseller_credits
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY manager_credits_all ON public.reseller_credits
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY reseller_credits_view_own ON public.reseller_credits
FOR SELECT TO authenticated
USING (reseller_id = auth.uid());
