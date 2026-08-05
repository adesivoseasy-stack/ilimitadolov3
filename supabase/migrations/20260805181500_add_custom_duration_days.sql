-- Adiciona coluna de validade personalizada em dias para créditos
-- Quando preenchido, as chaves geradas por esses créditos terão esse prazo de validade
ALTER TABLE public.reseller_credits
  ADD COLUMN IF NOT EXISTS custom_duration_days integer DEFAULT NULL;

COMMENT ON COLUMN public.reseller_credits.custom_duration_days IS
  'Validade em dias das chaves geradas pelo revendedor. NULL = padrão 30 dias.';
