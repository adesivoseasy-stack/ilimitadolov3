
ALTER TABLE public.reseller_credits
  ADD COLUMN IF NOT EXISTS lifetime_credits_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_credits_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.use_reseller_lifetime_credit(_reseller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _available integer;
BEGIN
  SELECT lifetime_credits_total - lifetime_credits_used INTO _available
  FROM public.reseller_credits
  WHERE reseller_id = _reseller_id
  FOR UPDATE;

  IF _available IS NULL OR _available <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.reseller_credits
  SET lifetime_credits_used = lifetime_credits_used + 1, updated_at = now()
  WHERE reseller_id = _reseller_id;

  RETURN true;
END;
$$;
