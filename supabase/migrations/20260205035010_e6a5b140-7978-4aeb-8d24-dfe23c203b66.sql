-- Add wildcard flag to licenses
ALTER TABLE public.licenses ADD COLUMN is_wildcard boolean DEFAULT false;

-- Create table to track IP usage for wildcard licenses
CREATE TABLE public.wildcard_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  message_count integer NOT NULL DEFAULT 1,
  first_used_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(license_id, ip_address)
);

-- Enable RLS
ALTER TABLE public.wildcard_usage ENABLE ROW LEVEL SECURITY;

-- Service role can manage wildcard usage (used by edge functions)
CREATE POLICY "Service role can manage wildcard usage"
ON public.wildcard_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_wildcard_usage_license_ip ON public.wildcard_usage(license_id, ip_address);