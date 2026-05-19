-- Limpa devices e sessions com HWIDs SRV2- falsos (gerados a partir do User-Agent do servidor n8n,
-- não do dispositivo real do usuário). Após a correção do validate-license-v2, os usuários
-- re-registrarão automaticamente com o HWID real encaminhado pelo n8n.
DELETE FROM public.sessions WHERE hwid LIKE 'SRV2-%';
DELETE FROM public.devices WHERE hwid LIKE 'SRV2-%';