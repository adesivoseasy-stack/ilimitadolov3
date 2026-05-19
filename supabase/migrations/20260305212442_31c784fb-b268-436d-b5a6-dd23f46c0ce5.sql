
-- Create reseller_credits table
CREATE TABLE public.reseller_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL,
  credits_total integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (reseller_id)
);

ALTER TABLE public.reseller_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own credits" ON public.reseller_credits
FOR SELECT TO authenticated
USING (reseller_id = auth.uid());

CREATE OR REPLACE FUNCTION public.use_reseller_credit(_reseller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _available integer;
BEGIN
  SELECT credits_total - credits_used INTO _available
  FROM public.reseller_credits
  WHERE reseller_id = _reseller_id
  FOR UPDATE;

  IF _available IS NULL OR _available <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.reseller_credits
  SET credits_used = credits_used + 1, updated_at = now()
  WHERE reseller_id = _reseller_id;

  RETURN true;
END;
$$;

CREATE POLICY "Managers can view all reseller profiles" ON public.reseller_profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update reseller profiles" ON public.reseller_profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all licenses" ON public.licenses
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));
