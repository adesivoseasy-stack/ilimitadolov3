CREATE OR REPLACE FUNCTION public.prevent_license_expiry_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_expires timestamptz;
  _base timestamptz;
BEGIN
  IF auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'manager'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_wildcard, false) AND NOT COALESCE(OLD.is_wildcard, false) THEN
    RAISE EXCEPTION 'Operação não permitida';
  END IF;

  _base := COALESCE(OLD.first_activated_at, OLD.created_at, NEW.created_at, now());
  _max_expires := _base + ((COALESCE(NEW.duration_hours, OLD.duration_hours, 720))::text || ' hours')::interval + interval '2 days';

  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at
     AND NEW.expires_at > OLD.expires_at
     AND NEW.expires_at > _max_expires THEN
    RAISE EXCEPTION 'Alteração de validade não permitida (max: %)', _max_expires;
  END IF;

  RETURN NEW;
END;
$$;