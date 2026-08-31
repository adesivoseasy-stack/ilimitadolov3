-- ============================================================
-- LOV3 — Planos com Limite Diário de Prompts
-- 2026-08-31
-- ============================================================

-- 1. Novo valor no ENUM: 'archived' (key preservada mas inativa)
-- ATENÇÃO: PostgreSQL não permite usar o novo valor ENUM na mesma transação.
-- O COMMIT abaixo garante que 'archived' esteja disponível para os UPDATEs seguintes.
ALTER TYPE license_status ADD VALUE IF NOT EXISTS 'archived';
COMMIT;
BEGIN;


-- 2. Colunas de plano e controle diário na tabela licenses
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS plan           TEXT         NOT NULL DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS daily_limit    INTEGER      NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS daily_used     INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMPTZ;

-- Constraint de integridade: valores de plano permitidos
ALTER TABLE public.licenses
  DROP CONSTRAINT IF EXISTS licenses_plan_check;
ALTER TABLE public.licenses
  ADD CONSTRAINT licenses_plan_check
  CHECK (plan IN ('basico', 'plus', 'pro', 'fundador'));

-- Índice para busca por plano (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_licenses_plan ON public.licenses (plan);

-- 3. Arquivar todas as keys vitalícias existentes
--    (expires_at > 5 anos a partir de hoje, exceto a key de teste do admin)
--    Status 'archived' = preservada no banco, pode ser reativada manualmente
UPDATE public.licenses
SET
  status = 'archived',
  notes  = COALESCE(notes, '') ||
           E'\n[Arquivada 2026-08-31: plano vitalicio descontinuado. Reative manualmente se necessario.]'
WHERE
  expires_at > (now() + INTERVAL '5 years')
  AND status NOT IN ('revoked', 'archived')
  AND UPPER(TRIM(license_key)) != 'EXZZ-3WJK-PK93-XWRD';

-- 4. Backfill: keys ativas sem plano → básico (50/dia)
UPDATE public.licenses
SET plan = 'basico', daily_limit = 50
WHERE status = 'active' AND plan = 'basico';

-- 5. Limites por plano (referência):
--    basico   → 50  /dia  — R$  79,90/mês
--    plus     → 100 /dia  — R$  99,99/mês
--    pro      → 200 /dia  — R$ 149,99/mês
--    fundador → 120 /dia  — R$  79,90/mês (benefício ex-vitalício, tempo limitado)

-- 6. Função atômica de débito diário
--    - Usa FOR UPDATE para evitar race condition com requests simultâneos
--    - Se 24h passou desde daily_reset_at → zera contador e conta como 1
--    - Se ainda no mesmo período de 24h → verifica e incrementa
--    - Retorna jsonb com: ok, remaining, daily_limit, daily_used, reason, reset_em_segundos

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
BEGIN
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

  -- Verifica se passaram 24h desde o último reset
  v_needs_reset := (v_daily_reset_at IS NULL)
                OR (now() - v_daily_reset_at >= INTERVAL '24 hours');

  IF v_needs_reset THEN
    -- Reseta contador e registra este uso como o primeiro do período
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
      EXTRACT(EPOCH FROM (v_daily_reset_at + INTERVAL '24 hours' - now()))::integer,
      0
    );
    RETURN jsonb_build_object(
      'ok',               false,
      'reason',           'daily_limit',
      'error',            'Limite diário atingido.',
      'reset_em_segundos', v_reset_secs,
      'daily_limit',      v_daily_limit,
      'daily_used',       v_daily_used
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
  'Debita 1 prompt diário de forma atômica. Reseta o contador a cada 24h desde o último reset (rolling window). Retorna ok=false com reason=daily_limit quando o usuário atingiu o limite do plano.';
