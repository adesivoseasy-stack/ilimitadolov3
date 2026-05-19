-- Allow Apollo to view own credit orders
CREATE POLICY "Apollo can view own credit orders"
  ON public.credit_orders
  FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Allow Apollo to insert own credit orders
CREATE POLICY "Apollo can insert own credit orders"
  ON public.credit_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (reseller_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Allow Apollo to view own reseller profile
CREATE POLICY "Apollo can view own reseller profile"
  ON public.reseller_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Allow Apollo to view own credits  
CREATE POLICY "Apollo can view own reseller credits"
  ON public.reseller_credits
  FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));