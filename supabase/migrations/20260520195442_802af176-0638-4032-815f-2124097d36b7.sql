CREATE OR REPLACE FUNCTION public.prevent_license_expiry_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _is_manager boolean;
  _max_expires timestamptz;
  _base timestamptz;
BEGIN
  -- Admins e managers podem alterar livremente
  _is_admin := has_role(auth.uid(), 'admin'::app_role);
  _is_manager := has_role(auth.uid(), 'manager'::app_role);
  IF _is_admin OR _is_manager THEN
    RETURN NEW;
  END IF;

  -- Service role (auth.uid IS NULL) também pode
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloqueia wildcard para não-admins
  IF TG_OP = 'INSERT' AND COALESCE(NEW.is_wildcard, false) THEN
    RAISE EXCEPTION 'Revendedores não podem criar licenças wildcard';
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.is_wildcard, false) AND NOT COALESCE(OLD.is_wildcard, false) THEN
    RAISE EXCEPTION 'Revendedores não podem transformar licenças em wildcard';
  END IF;

  -- Calcula validade máxima permitida = base + duration_hours + margem 1 dia
  _base := COALESCE(NEW.first_activated_at, NEW.created_at, now());
  _max_expires := _base + ((COALESCE(NEW.duration_hours, 720))::text || ' hours')::interval + interval '1 day';

  IF TG_OP = 'UPDATE' THEN
    -- Bloqueia aumento de expires_at acima do permitido
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at AND NEW.expires_at > _max_expires THEN
      RAISE EXCEPTION 'Alteração de validade não permitida (max: %)', _max_expires;
    END IF;
    -- Bloqueia mudança de duration_hours acima de 35 dias
    IF NEW.duration_hours IS DISTINCT FROM OLD.duration_hours AND NEW.duration_hours > 840 THEN
      RAISE EXCEPTION 'Duração inválida';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.expires_at > _max_expires THEN
      RAISE EXCEPTION 'Validade inicial inválida (max: %)', _max_expires;
    END IF;
    IF COALESCE(NEW.duration_hours, 720) > 840 THEN
      RAISE EXCEPTION 'Duração inicial inválida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_license_expiry_tampering ON public.licenses;
CREATE TRIGGER trg_prevent_license_expiry_tampering
BEFORE INSERT OR UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_license_expiry_tampering();