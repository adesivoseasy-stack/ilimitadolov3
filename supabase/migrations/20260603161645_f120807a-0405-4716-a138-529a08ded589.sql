ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on licenses" ON public.licenses;
DROP POLICY IF EXISTS "Allow public update on licenses" ON public.licenses;

CREATE POLICY "Allow public select on licenses"
  ON public.licenses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public update on licenses"
  ON public.licenses
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.licenses TO anon;
GRANT SELECT, UPDATE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;