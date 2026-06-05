-- Fix critical security findings: remove public access to licenses table
-- and add missing DELETE policy for Apollo users on apollo_hoopay_config

-- 1. Remove overly permissive public policies on licenses table
--    These allowed any unauthenticated user to read all 204+ license records
--    and UPDATE any row freely (including revoking/extending licenses).
--    License validation is done via service-role Edge Functions.
DROP POLICY IF EXISTS "Allow public select on licenses" ON public.licenses;
DROP POLICY IF EXISTS "Allow public update on licenses" ON public.licenses;

-- 2. Add DELETE policy so Apollo users can clean up their own Hoopay credentials
CREATE POLICY "Apollo can delete own hoopay config"
  ON public.apollo_hoopay_config
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid())
    AND has_role(auth.uid(), 'apollo'::app_role)
  );