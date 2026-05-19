DROP POLICY IF EXISTS "Service role can manage test_license_ips" ON public.test_license_ips;

CREATE POLICY "Service role can manage test_license_ips"
ON public.test_license_ips
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);