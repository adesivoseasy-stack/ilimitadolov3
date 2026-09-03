-- ============================================================
-- LOV3 - Fix reset diário: dia calendário (meia-noite Brasília)
-- em vez de janela rolante de 24h
-- ============================================================
CREATE OR REPLACE FUNCTION public.debitar_prompt_diario(p_license_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit    integer;
  v_daily_used     integer;
  v_daily_reset_at timestamptz;
  v_needs_reset    boolean;
  v_remaining      integer;
  v_reset_secs     integer;
  v_today          date;
  v_tomorrow_mid   timestamptz;
BEGIN
  -- Dia atual no fuso de Brasília
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  -- Lock atômico na linha para evitar duplo débito
  SELECT daily_limit, daily_used, daily_reset_at
  INTO   v_daily_limit, v_daily_used, v_daily_reset_at
  FROM   public.licenses
  WHERE  id = p_license_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'reason','not_found',
      'error', 'Licença não encontrada.'
    );
  END IF;

  -- Reset baseado em dia calendário Brasília (não 24h rolante)
  -- Reseta se: nunca resetou OU se o último reset foi num dia anterior ao de hoje
  v_needs_reset := (v_daily_reset_at IS NULL)
                OR ((v_daily_reset_at AT TIME ZONE 'America/Sao_Paulo')::date < v_today);

  -- Meia-noite de amanhã (Brasília) para cálculo de tempo até próximo reset
  v_tomorrow_mid := ((v_today + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';

  IF v_needs_reset THEN
    -- Reseta contador e registra este uso como o primeiro do dia
    UPDATE public.licenses
    SET    daily_used = 1, daily_reset_at = now()
    WHERE  id = p_license_id;

    RETURN jsonb_build_object(
      'ok',          true,
      'remaining',   GREATEST(v_daily_limit - 1, 0),
      'daily_limit', v_daily_limit,
      'daily_used',  1
    );
  END IF;

  -- Limite atingido?
  IF v_daily_used >= v_daily_limit THEN
    v_reset_secs := GREATEST(
      EXTRACT(EPOCH FROM (v_tomorrow_mid - now()))::integer,
      0
    );
    RETURN jsonb_build_object(
      'ok',                false,
      'reason',            'daily_limit',
      'error',             'Limite diário atingido.',
      'reset_em_segundos', v_reset_secs,
      'daily_limit',       v_daily_limit,
      'daily_used',        v_daily_used
    );
  END IF;

  -- Incrementa contador
  UPDATE public.licenses
  SET    daily_used = daily_used + 1
  WHERE  id = p_license_id;

  v_remaining := v_daily_limit - v_daily_used - 1;

  RETURN jsonb_build_object(
    'ok',          true,
    'remaining',   GREATEST(v_remaining, 0),
    'daily_limit', v_daily_limit,
    'daily_used',  v_daily_used + 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debitar_prompt_diario(uuid) TO service_role;

COMMENT ON FUNCTION public.debitar_prompt_diario(uuid) IS
  'Debita 1 prompt diário de forma atômica. Reseta à meia-noite horário Brasília (America/Sao_Paulo). Retorna ok=false com reason=daily_limit quando o usuário atingiu o limite do plano.';
