-- Configura a URL de download da extensão LOV 3.5 para os revendedores
INSERT INTO public.system_config (key, value, description)
VALUES (
  'extension_zip_url',
  'https://ccqesqhkqbnnwmowrghj.supabase.co/storage/v1/object/public/template-images/LOV%203.5.rar',
  'URL do arquivo LOV 3.5 para download pelos revendedores via botão Baixar Extensão'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();
