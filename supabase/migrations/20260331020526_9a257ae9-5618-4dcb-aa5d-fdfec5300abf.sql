
INSERT INTO public.system_config (key, value, description)
VALUES 
  ('master_hoopay_organization_uuid', '', 'UUID da organização master no HooPay para receber split dos Apollo admins'),
  ('master_hoopay_affiliate_id', '', 'ID de afiliado master no HooPay para split')
ON CONFLICT DO NOTHING;
