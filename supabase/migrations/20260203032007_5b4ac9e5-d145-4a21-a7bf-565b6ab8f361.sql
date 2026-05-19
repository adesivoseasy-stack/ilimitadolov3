-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can view all templates"
ON public.templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert templates"
ON public.templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
ON public.templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
ON public.templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for template images
INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true);

-- Storage policies for template images
CREATE POLICY "Anyone can view template images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'template-images');

CREATE POLICY "Admins can upload template images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'template-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update template images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'template-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete template images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'template-images' AND auth.uid() IS NOT NULL);