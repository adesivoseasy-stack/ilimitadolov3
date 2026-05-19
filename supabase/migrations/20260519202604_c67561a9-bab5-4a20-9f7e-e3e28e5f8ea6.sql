
-- Licenças pagas SEM dispositivo conectado: resetar para "aguardando ativação" (30 dias)
UPDATE public.licenses
SET 
  duration_hours = 720,
  first_activated_at = NULL,
  expires_at = (now() + interval '100 years')
WHERE is_wildcard = false
  AND status = 'active'
  AND license_key NOT LIKE 'TESTE-%'
  AND (duration_hours IS NULL OR duration_hours > 0.5)
  AND NOT EXISTS (SELECT 1 FROM public.devices d WHERE d.license_id = licenses.id);

-- Licenças pagas COM dispositivo já conectado: fixar expiração em primeira_ativação + 30 dias
UPDATE public.licenses
SET 
  duration_hours = 720,
  first_activated_at = COALESCE(first_activated_at, created_at),
  expires_at = COALESCE(first_activated_at, created_at) + interval '30 days'
WHERE is_wildcard = false
  AND status = 'active'
  AND license_key NOT LIKE 'TESTE-%'
  AND (duration_hours IS NULL OR duration_hours > 0.5)
  AND EXISTS (SELECT 1 FROM public.devices d WHERE d.license_id = licenses.id);
