-- Adiciona UNIQUE constraint em blocked_keys.license_key
-- Necessario para upsert funcionar no painel admin

-- Remove duplicatas primeiro (mantém o mais recente)
DELETE FROM blocked_keys a
USING blocked_keys b
WHERE a.id < b.id
  AND lower(a.license_key) = lower(b.license_key);

-- Adiciona a constraint
ALTER TABLE blocked_keys
  ADD CONSTRAINT blocked_keys_license_key_unique UNIQUE (license_key);