-- clean_migration_part2.sql
-- Contains FUNCTIONS and TRIGGERS

DO $$ BEGIN

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$func$;

CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $func$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  segment INTEGER;
BEGIN
  FOR segment IN 1..4 LOOP
    IF segment > 1 THEN
      result := result || '-';
    END IF;
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$func$;

CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
    DELETE FROM public.sessions WHERE expires_at < now();
END;
$func$;

CREATE OR REPLACE FUNCTION public.generate_session_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $func$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..64 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$func$;

CREATE OR REPLACE FUNCTION public.clean_old_bot_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  DELETE FROM public.telegram_bot_states WHERE updated_at < now() - interval '1 hour';
END;
$func$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.use_reseller_credit(_reseller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
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
$func$;

CREATE OR REPLACE FUNCTION public.use_reseller_lifetime_credit(_reseller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
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
$func$;

CREATE OR REPLACE FUNCTION public.update_expired_licenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $func$
BEGIN
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.licenses WHERE status = 'expired' AND (
    license_key LIKE 'TESTE-%' OR
    max_messages IS NOT NULL OR 
    (duration_hours IS NOT NULL AND duration_hours <= 0.17)
  );

  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours';
END;
$func$;

CREATE OR REPLACE FUNCTION public.register_license_ip(
  _license_id UUID,
  _ip_address TEXT,
  _user_agent TEXT DEFAULT NULL,
  _hwid TEXT DEFAULT NULL,
  _max_unique_ips INTEGER DEFAULT 1,
  _window_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _unique_ips INTEGER;
  _is_wildcard BOOLEAN;
  _current_status TEXT;
  _ip_list TEXT[];
BEGIN
  SELECT is_wildcard, status INTO _is_wildcard, _current_status
  FROM public.licenses WHERE id = _license_id;

  IF _is_wildcard THEN
    RETURN jsonb_build_object('revoked', false, 'reason', 'wildcard_skip');
  END IF;

  IF _current_status = 'revoked' THEN
    RETURN jsonb_build_object('revoked', true, 'reason', 'already_revoked');
  END IF;

  INSERT INTO public.license_ip_tracking (license_id, ip_address, user_agent, hwid)
  VALUES (_license_id, _ip_address, _user_agent, _hwid)
  ON CONFLICT (license_id, ip_address) DO UPDATE
  SET access_count = license_ip_tracking.access_count + 1,
      last_seen_at = now(),
      user_agent = COALESCE(EXCLUDED.user_agent, license_ip_tracking.user_agent),
      hwid = COALESCE(EXCLUDED.hwid, license_ip_tracking.hwid);

  SELECT COUNT(DISTINCT ip_address), array_agg(DISTINCT ip_address)
  INTO _unique_ips, _ip_list
  FROM public.license_ip_tracking
  WHERE license_id = _license_id
    AND last_seen_at >= now() - (_window_hours || ' hours')::INTERVAL
    AND ip_address != 'unknown';

  IF _unique_ips > _max_unique_ips THEN
    UPDATE public.licenses
    SET status = 'revoked',
        revoked_at = now()
    WHERE id = _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (
      _license_id,
      'auto_revoked_ip_abuse',
      jsonb_build_object(
        'unique_ips', _unique_ips,
        'limit', _max_unique_ips,
        'window_hours', _window_hours,
        'ips', _ip_list,
        'triggered_by_ip', _ip_address
      )
    );

    RETURN jsonb_build_object(
      'revoked', true,
      'reason', 'ip_abuse',
      'unique_ips', _unique_ips,
      'ips', _ip_list
    );
  END IF;

  RETURN jsonb_build_object('revoked', false, 'unique_ips', _unique_ips);
END;
$func$;

CREATE OR REPLACE FUNCTION public.register_license_project(
  _license_id UUID,
  _project_id TEXT,
  _max_unique_projects INTEGER DEFAULT 2,
  _window_seconds INTEGER DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _unique_projects INTEGER;
  _is_wildcard BOOLEAN;
  _current_status TEXT;
  _project_list TEXT[];
BEGIN
  SELECT is_wildcard, status INTO _is_wildcard, _current_status
  FROM public.licenses WHERE id = _license_id;

  IF _is_wildcard THEN
    RETURN jsonb_build_object('revoked', false, 'reason', 'wildcard_skip');
  END IF;

  IF _current_status = 'revoked' THEN
    RETURN jsonb_build_object('revoked', true, 'reason', 'already_revoked');
  END IF;

  INSERT INTO public.license_project_tracking (license_id, project_id)
  VALUES (_license_id, _project_id)
  ON CONFLICT (license_id, project_id) DO UPDATE
    SET message_count = license_project_tracking.message_count + 1,
        last_seen_at = now();

  SELECT COUNT(DISTINCT project_id), array_agg(DISTINCT project_id)
  INTO _unique_projects, _project_list
  FROM public.license_project_tracking
  WHERE license_id = _license_id
    AND last_seen_at >= now() - (_window_seconds || ' seconds')::INTERVAL;

  IF _unique_projects > _max_unique_projects THEN
    UPDATE public.licenses
    SET status = 'revoked', revoked_at = now()
    WHERE id = _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (
      _license_id,
      'auto_revoked_project_abuse',
      jsonb_build_object(
        'unique_projects', _unique_projects,
        'limit', _max_unique_projects,
        'window_seconds', _window_seconds,
        'projects', _project_list,
        'triggered_by_project', _project_id
      )
    );

    RETURN jsonb_build_object(
      'revoked', true,
      'reason', 'project_abuse',
      'unique_projects', _unique_projects,
      'projects', _project_list
    );
  END IF;

  RETURN jsonb_build_object('revoked', false, 'unique_projects', _unique_projects);
END;
$func$;

CREATE OR REPLACE FUNCTION public.prevent_license_expiry_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
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
$func$;

CREATE OR REPLACE FUNCTION public.admin_list_resellers()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $func$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH lic AS (
    SELECT created_by, count(*) FILTER (WHERE max_messages IS NULL) AS license_count
    FROM public.licenses
    WHERE created_by IS NOT NULL
    GROUP BY created_by
  ),
  cred AS (
    SELECT reseller_id, credits_total, credits_used, lifetime_credits_total, lifetime_credits_used
    FROM public.reseller_credits
  ),
  paid AS (
    SELECT reseller_id, SUM(quantity)::int AS paid_keys
    FROM public.credit_orders
    WHERE status = 'paid'
    GROUP BY reseller_id
  )
  SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      to_jsonb(rp) || jsonb_build_object(
        'licenseCount', COALESCE(lic.license_count, 0),
        'credits_total', COALESCE(cred.credits_total, 0),
        'credits_used', COALESCE(cred.credits_used, 0),
        'lifetime_credits_total', COALESCE(cred.lifetime_credits_total, 0),
        'lifetime_credits_used', COALESCE(cred.lifetime_credits_used, 0),
        'paidKeys', COALESCE(paid.paid_keys, 0)
      ) AS r
    FROM public.reseller_profiles rp
    LEFT JOIN lic  ON lic.created_by  = rp.user_id
    LEFT JOIN cred ON cred.reseller_id = rp.user_id
    LEFT JOIN paid ON paid.reseller_id = rp.user_id
  ) t;

  RETURN _result;
END;
$func$;

CREATE OR REPLACE FUNCTION public.admin_list_licenses()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $func$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(l_with_devices ORDER BY (l_with_devices->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT to_jsonb(l) || jsonb_build_object(
      'devices', COALESCE(
        (SELECT jsonb_agg(to_jsonb(d)) FROM public.devices d WHERE d.license_id = l.id),
        '[]'::jsonb
      )
    ) AS l_with_devices
    FROM public.licenses l
  ) t;

  RETURN _result;
END;
$func$;

CREATE OR REPLACE FUNCTION public.recalc_reseller_progress(_reseller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  _total_sales integer;
  _current_level RECORD;
  _next_level RECORD;
BEGIN
  IF _reseller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantity), 0)::int INTO _total_sales
  FROM public.credit_orders
  WHERE reseller_id = _reseller_id AND status = 'paid';

  SELECT * INTO _current_level
  FROM public.community_discount_levels
  WHERE sales_required <= _total_sales
  ORDER BY order_index DESC
  LIMIT 1;

  SELECT * INTO _next_level
  FROM public.community_discount_levels
  WHERE sales_required > _total_sales
  ORDER BY order_index ASC
  LIMIT 1;

  INSERT INTO public.reseller_community_progress (
    reseller_id, current_sales, current_level_id, current_discount, next_level_id, sales_to_next
  ) VALUES (
    _reseller_id,
    _total_sales,
    _current_level.id,
    COALESCE(_current_level.discount_percentage, 0),
    _next_level.id,
    CASE WHEN _next_level.id IS NOT NULL THEN _next_level.sales_required - _total_sales ELSE NULL END
  )
  ON CONFLICT (reseller_id) DO UPDATE SET
    current_sales = EXCLUDED.current_sales,
    current_level_id = EXCLUDED.current_level_id,
    current_discount = EXCLUDED.current_discount,
    next_level_id = EXCLUDED.next_level_id,
    sales_to_next = EXCLUDED.sales_to_next,
    updated_at = now();
END;
$func$;

CREATE OR REPLACE FUNCTION public.on_credit_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.recalc_reseller_progress(NEW.reseller_id);
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.admin_reset_community_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.reseller_community_progress
  SET current_sales = 0, current_level_id = NULL, current_discount = 0,
      next_level_id = (SELECT id FROM public.community_discount_levels ORDER BY order_index ASC LIMIT 1),
      sales_to_next = (SELECT sales_required FROM public.community_discount_levels ORDER BY order_index ASC LIMIT 1),
      updated_at = now();
END;
$func$;

CREATE OR REPLACE FUNCTION public.normalize_test_license_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $func$
BEGIN
  IF NEW.license_key LIKE 'TESTE-%' AND char_length(NEW.license_key) > 23 THEN
    NEW.license_key := substring(NEW.license_key from 1 for 23);
  END IF;

  RETURN NEW;
END;
$func$;

-- GRANTS FOR FUNCTIONS
REVOKE ALL ON FUNCTION public.admin_list_licenses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_licenses() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_resellers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_resellers() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_reseller_progress(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.on_credit_order_paid() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_community_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_community_progress() TO authenticated;

-- TRIGGERS
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_system_config_updated_at ON public.system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_reseller_profiles_updated_at ON public.reseller_profiles;
CREATE TRIGGER update_reseller_profiles_updated_at BEFORE UPDATE ON public.reseller_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_credit_orders_updated_at ON public.credit_orders;
CREATE TRIGGER update_credit_orders_updated_at BEFORE UPDATE ON public.credit_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_credits_customers_updated_at ON public.credits_customers;
CREATE TRIGGER update_credits_customers_updated_at BEFORE UPDATE ON public.credits_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_community_discount_levels_updated_at ON public.community_discount_levels;
CREATE TRIGGER update_community_discount_levels_updated_at BEFORE UPDATE ON public.community_discount_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_community_discount_config_updated_at ON public.community_discount_config;
CREATE TRIGGER update_community_discount_config_updated_at BEFORE UPDATE ON public.community_discount_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_reseller_community_progress_updated_at ON public.reseller_community_progress;
CREATE TRIGGER update_reseller_community_progress_updated_at BEFORE UPDATE ON public.reseller_community_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_prevent_license_expiry_tampering ON public.licenses;
CREATE TRIGGER trg_prevent_license_expiry_tampering BEFORE INSERT OR UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.prevent_license_expiry_tampering();
DROP TRIGGER IF EXISTS credit_order_paid_recalc_progress ON public.credit_orders;
CREATE TRIGGER credit_order_paid_recalc_progress AFTER INSERT OR UPDATE ON public.credit_orders FOR EACH ROW EXECUTE FUNCTION public.on_credit_order_paid();
DROP TRIGGER IF EXISTS normalize_test_license_key_before_insert_update ON public.licenses;
CREATE TRIGGER normalize_test_license_key_before_insert_update BEFORE INSERT OR UPDATE OF license_key ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.normalize_test_license_key();

EXCEPTION WHEN OTHERS THEN NULL; END $$;
