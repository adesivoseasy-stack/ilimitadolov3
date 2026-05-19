-- Create system_config table to store sensitive configuration
CREATE TABLE public.system_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view config
CREATE POLICY "Admins can view config" ON public.system_config
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert config
CREATE POLICY "Admins can insert config" ON public.system_config
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update config
CREATE POLICY "Admins can update config" ON public.system_config
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete config
CREATE POLICY "Admins can delete config" ON public.system_config
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_system_config_updated_at
BEFORE UPDATE ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the webhook URL
INSERT INTO public.system_config (key, value, description)
VALUES ('n8n_webhook_url', 'https://n8n.projetocode.com.br/webhook/lovable-ninja', 'URL do webhook n8n para processar mensagens da extensão');