-- Add permissive SELECT policy for admins to view wildcard usage
CREATE POLICY "Admins can view wildcard usage"
ON public.wildcard_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));