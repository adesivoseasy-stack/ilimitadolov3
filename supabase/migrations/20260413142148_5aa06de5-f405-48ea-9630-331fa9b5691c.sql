
-- Fix 1: Add admin and delete policies to apollo_syncpay_config
CREATE POLICY "Admins can manage all syncpay config"
ON public.apollo_syncpay_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own syncpay config"
ON public.apollo_syncpay_config
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix 2: Drop and recreate apollo token_metrics policy to exclude NULL license_id leak
DROP POLICY IF EXISTS "Apollo can view own token metrics" ON public.token_metrics;

CREATE POLICY "Apollo can view own token metrics"
ON public.token_metrics
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'apollo'::app_role)
  AND license_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = token_metrics.license_id
    AND licenses.created_by = auth.uid()
  )
);
