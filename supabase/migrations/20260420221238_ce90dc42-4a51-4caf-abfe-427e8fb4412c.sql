-- Atualizar a URL do webhook n8n
UPDATE system_config 
SET value = 'https://primary-production-ca741.up.railway.app/webhook/lov2.0',
    updated_at = now()
WHERE key = 'n8n_webhook_url';

-- Se não existir, criar o registro
INSERT INTO system_config (key, value, description)
SELECT 'n8n_webhook_url', 'https://primary-production-ca741.up.railway.app/webhook/lov2.0', 'URL do webhook n8n para processamento de mensagens'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'n8n_webhook_url');