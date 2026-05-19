
-- Fix: Change wildcard_usage "Service role can manage" policy from public to service_role
DROP POLICY IF EXISTS "Service role can manage wildcard usage" ON public.wildcard_usage;

CREATE POLICY "Service role can manage wildcard usage"
ON public.wildcard_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
