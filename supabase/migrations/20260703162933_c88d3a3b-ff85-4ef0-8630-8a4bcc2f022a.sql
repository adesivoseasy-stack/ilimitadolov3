CREATE OR REPLACE FUNCTION public.normalize_test_license_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.license_key LIKE 'TESTE-%' AND char_length(NEW.license_key) > 23 THEN
    NEW.license_key := substring(NEW.license_key from 1 for 23);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_test_license_key_before_insert_update ON public.licenses;

CREATE TRIGGER normalize_test_license_key_before_insert_update
BEFORE INSERT OR UPDATE OF license_key ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.normalize_test_license_key();

UPDATE public.licenses
SET license_key = substring(license_key from 1 for 23)
WHERE license_key LIKE 'TESTE-%'
  AND char_length(license_key) > 23;