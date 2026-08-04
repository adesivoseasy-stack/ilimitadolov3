-- === FILE: 20260203011123_ec0cbce8-afe5-46c4-8855-c6894cc49496.sql ===
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create license_status enum
CREATE TYPE public.license_status AS ENUM ('active', 'expired', 'revoked');

-- Create licenses table
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  status license_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  price DECIMAL(10, 2) DEFAULT 0
);

-- Enable RLS on licenses
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Create devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
  hwid TEXT NOT NULL,
  device_name TEXT,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (license_id)
);

-- Enable RLS on devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create license_logs table for activity history
CREATE TABLE public.license_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on license_logs
ALTER TABLE public.license_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (only admins can see roles)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for licenses (only admins can manage)
CREATE POLICY "Admins can view all licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert licenses"
ON public.licenses
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update licenses"
ON public.licenses
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete licenses"
ON public.licenses
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for devices (only admins can manage)
CREATE POLICY "Admins can view all devices"
ON public.devices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert devices"
ON public.devices
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update devices"
ON public.devices
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete devices"
ON public.devices
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for license_logs (only admins can view)
CREATE POLICY "Admins can view all logs"
ON public.license_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
ON public.license_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to generate unique license key
CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  segment INTEGER;
BEGIN
  FOR segment IN 1..4 LOOP
    IF segment > 1 THEN
      result := result || '-';
    END IF;
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$$;

-- Function to update license status based on expiration
CREATE OR REPLACE FUNCTION public.update_expired_licenses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$;

-- === FILE: 20260203011140_76cdb279-99e3-4a3a-8030-a0ca9c1efa3d.sql ===
-- Fix generate_license_key function search path
CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  segment INTEGER;
BEGIN
  FOR segment IN 1..4 LOOP
    IF segment > 1 THEN
      result := result || '-';
    END IF;
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$$;

-- === FILE: 20260203015746_5b54aef8-59e2-4966-b9e7-405e26b17c94.sql ===
-- Create sessions table for secure temporary tokens
CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    hwid text NOT NULL,
    session_token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_activity timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_sessions_token ON public.sessions(session_token);
CREATE INDEX idx_sessions_expires ON public.sessions(expires_at);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies - only server can manage sessions (via service role)
CREATE POLICY "Service role can manage sessions"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION public.clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.sessions WHERE expires_at < now();
END;
$$;

-- Function to generate secure session token
CREATE OR REPLACE FUNCTION public.generate_session_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..64 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- === FILE: 20260203023012_2cf2c672-e6eb-497b-8d41-57a2efae06d7.sql ===
-- Create table to store bot user states
CREATE TABLE IF NOT EXISTS public.telegram_bot_states (
  user_id BIGINT PRIMARY KEY,
  action TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_bot_states ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access
CREATE POLICY "Service role only" ON public.telegram_bot_states
  FOR ALL USING (false);

-- Auto-cleanup old states (older than 1 hour)
CREATE OR REPLACE FUNCTION public.clean_old_bot_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.telegram_bot_states WHERE updated_at < now() - interval '1 hour';
END;
$$;

-- === FILE: 20260203032007_5b4ac9e5-d145-4a21-a7bf-565b6ab8f361.sql ===
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

-- === FILE: 20260203034545_37167fcd-b258-4c96-8a72-9296a501a31d.sql ===
-- Add video_url column to templates table
ALTER TABLE public.templates ADD COLUMN video_url text;

-- === FILE: 20260204124831_32006401-6c24-4eac-ad3c-8147492c1a8d.sql ===
-- Add columns to track intended duration and first activation
ALTER TABLE public.licenses 
ADD COLUMN duration_hours numeric NULL,
ADD COLUMN first_activated_at timestamp with time zone NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.licenses.duration_hours IS 'Intended duration in hours. If set, expires_at is calculated from first_activated_at';
COMMENT ON COLUMN public.licenses.first_activated_at IS 'When the license was first activated/used. NULL means not yet activated';

-- === FILE: 20260205035010_e6a5b140-7978-4aeb-8d24-dfe23c203b66.sql ===
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

-- === FILE: 20260206203526_195f588e-81cc-4269-a0fb-c38c7fd69bcc.sql ===
-- Add permissive SELECT policy for admins to view wildcard usage
CREATE POLICY "Admins can view wildcard usage"
ON public.wildcard_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- === FILE: 20260209020351_4b6dd194-8741-48b7-834e-c8b57eb79a63.sql ===
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
VALUES ('n8n_webhook_url', 'https://n8n.projetocode.com.br/webhook/lovable-ninja', 'URL do webhook n8n para processar mensagens da extensÃ£o');

-- === FILE: 20260219132613_e92f6c2b-a064-4aa4-bca3-e2bc9984004c.sql ===

-- Add 'reseller' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';


-- === FILE: 20260219140841_d9c33f6d-64f7-4af7-b407-6ad92f732aa7.sql ===

-- Create reseller profiles table
CREATE TABLE public.reseller_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add created_by column to licenses
ALTER TABLE public.licenses ADD COLUMN created_by UUID;

-- Enable RLS on reseller_profiles
ALTER TABLE public.reseller_profiles ENABLE ROW LEVEL SECURITY;

-- Admins full access on reseller_profiles
CREATE POLICY "Admins can view all reseller profiles"
  ON public.reseller_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reseller profiles"
  ON public.reseller_profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reseller profiles"
  ON public.reseller_profiles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert own profile (registration)
CREATE POLICY "Users can insert own reseller profile"
  ON public.reseller_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Resellers can view own profile
CREATE POLICY "Resellers can view own profile"
  ON public.reseller_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Resellers can view own licenses
CREATE POLICY "Resellers can view own licenses"
  ON public.licenses FOR SELECT
  USING (created_by = auth.uid());

-- Resellers can insert licenses
CREATE POLICY "Resellers can insert licenses"
  ON public.licenses FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'reseller'::app_role)
    AND created_by = auth.uid()
  );

-- Resellers can update own licenses
CREATE POLICY "Resellers can update own licenses"
  ON public.licenses FOR UPDATE
  USING (
    has_role(auth.uid(), 'reseller'::app_role)
    AND created_by = auth.uid()
  );

-- Resellers can view devices of their licenses
CREATE POLICY "Resellers can view own devices"
  ON public.devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses
      WHERE licenses.id = devices.license_id
      AND licenses.created_by = auth.uid()
    )
  );

-- Resellers can view logs of their licenses
CREATE POLICY "Resellers can view own license logs"
  ON public.license_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses
      WHERE licenses.id = license_logs.license_id
      AND licenses.created_by = auth.uid()
    )
  );

-- Resellers can insert logs for their licenses
CREATE POLICY "Resellers can insert own license logs"
  ON public.license_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.licenses
      WHERE licenses.id = license_logs.license_id
      AND licenses.created_by = auth.uid()
    )
  );

-- Users can view own role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_reseller_profiles_updated_at
  BEFORE UPDATE ON public.reseller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- === FILE: 20260305212429_dd071360-9eb7-47c4-b75f-faaed39b8d61.sql ===
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- === FILE: 20260305212442_31c784fb-b268-436d-b5a6-dd23f46c0ce5.sql ===

-- Create reseller_credits table
CREATE TABLE public.reseller_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL,
  credits_total integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (reseller_id)
);

ALTER TABLE public.reseller_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own credits" ON public.reseller_credits
FOR SELECT TO authenticated
USING (reseller_id = auth.uid());

CREATE OR REPLACE FUNCTION public.use_reseller_credit(_reseller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _available integer;
BEGIN
  SELECT credits_total - credits_used INTO _available
  FROM public.reseller_credits
  WHERE reseller_id = _reseller_id
  FOR UPDATE;

  IF _available IS NULL OR _available <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.reseller_credits
  SET credits_used = credits_used + 1, updated_at = now()
  WHERE reseller_id = _reseller_id;

  RETURN true;
END;
$$;

CREATE POLICY "Managers can view all reseller profiles" ON public.reseller_profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update reseller profiles" ON public.reseller_profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all licenses" ON public.licenses
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));


-- === FILE: 20260305213227_57e8c890-a21c-44f7-83d3-6962d5bb65ff.sql ===

-- Managers can update licenses
CREATE POLICY "Managers can update all licenses" ON public.licenses
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert licenses
CREATE POLICY "Managers can insert licenses" ON public.licenses
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete licenses
CREATE POLICY "Managers can delete licenses" ON public.licenses
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can view all devices
CREATE POLICY "Managers can view all devices" ON public.devices
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can update devices
CREATE POLICY "Managers can update devices" ON public.devices
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete devices
CREATE POLICY "Managers can delete devices" ON public.devices
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert devices
CREATE POLICY "Managers can insert devices" ON public.devices
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert license_logs
CREATE POLICY "Managers can insert logs" ON public.license_logs
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can view license_logs
CREATE POLICY "Managers can view all logs" ON public.license_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete reseller profiles
CREATE POLICY "Managers can delete reseller profiles" ON public.reseller_profiles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers can insert roles
CREATE POLICY "Managers can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Managers can delete roles
CREATE POLICY "Managers can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));


-- === FILE: 20260305231210_f937de7a-a0b1-4ea0-b404-fabc140e96d0.sql ===

-- Fix RLS policies on reseller_profiles: change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Admins can update reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Admins can delete reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Managers can view all reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Managers can update reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Managers can delete reseller profiles" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Resellers can view own profile" ON public.reseller_profiles;
DROP POLICY IF EXISTS "Users can insert own reseller profile" ON public.reseller_profiles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can view all reseller profiles" ON public.reseller_profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reseller profiles" ON public.reseller_profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reseller profiles" ON public.reseller_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all reseller profiles" ON public.reseller_profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update reseller profiles" ON public.reseller_profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete reseller profiles" ON public.reseller_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own profile" ON public.reseller_profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reseller profile" ON public.reseller_profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix same issue on user_roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix licenses table
DROP POLICY IF EXISTS "Admins can view all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can delete licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can view all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can update all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Managers can delete licenses" ON public.licenses;
DROP POLICY IF EXISTS "Resellers can view own licenses" ON public.licenses;
DROP POLICY IF EXISTS "Resellers can insert licenses" ON public.licenses;
DROP POLICY IF EXISTS "Resellers can update own licenses" ON public.licenses;

CREATE POLICY "Admins can view all licenses" ON public.licenses
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert licenses" ON public.licenses
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update licenses" ON public.licenses
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete licenses" ON public.licenses
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all licenses" ON public.licenses
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert licenses" ON public.licenses
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update all licenses" ON public.licenses
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete licenses" ON public.licenses
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own licenses" ON public.licenses
FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Resellers can insert licenses" ON public.licenses
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());

CREATE POLICY "Resellers can update own licenses" ON public.licenses
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'reseller'::app_role) AND created_by = auth.uid());

-- Fix devices table
DROP POLICY IF EXISTS "Admins can view all devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can insert devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can update devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can delete devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can view all devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can insert devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can update devices" ON public.devices;
DROP POLICY IF EXISTS "Managers can delete devices" ON public.devices;
DROP POLICY IF EXISTS "Resellers can view own devices" ON public.devices;

CREATE POLICY "Admins can view all devices" ON public.devices
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert devices" ON public.devices
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update devices" ON public.devices
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete devices" ON public.devices
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all devices" ON public.devices
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert devices" ON public.devices
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update devices" ON public.devices
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete devices" ON public.devices
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own devices" ON public.devices
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()));

-- Fix license_logs table
DROP POLICY IF EXISTS "Admins can view all logs" ON public.license_logs;
DROP POLICY IF EXISTS "Admins can insert logs" ON public.license_logs;
DROP POLICY IF EXISTS "Managers can view all logs" ON public.license_logs;
DROP POLICY IF EXISTS "Managers can insert logs" ON public.license_logs;
DROP POLICY IF EXISTS "No one can delete logs" ON public.license_logs;
DROP POLICY IF EXISTS "No one can update logs" ON public.license_logs;
DROP POLICY IF EXISTS "Resellers can view own license logs" ON public.license_logs;
DROP POLICY IF EXISTS "Resellers can insert own license logs" ON public.license_logs;

CREATE POLICY "Admins can view all logs" ON public.license_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs" ON public.license_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all logs" ON public.license_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert logs" ON public.license_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "No one can delete logs" ON public.license_logs
FOR DELETE TO authenticated USING (false);

CREATE POLICY "No one can update logs" ON public.license_logs
FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Resellers can view own license logs" ON public.license_logs
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()));

CREATE POLICY "Resellers can insert own license logs" ON public.license_logs
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()));

-- Fix reseller_credits table
DROP POLICY IF EXISTS "Admins can manage reseller credits" ON public.reseller_credits;
DROP POLICY IF EXISTS "Managers can manage reseller credits" ON public.reseller_credits;
DROP POLICY IF EXISTS "Resellers can view own credits" ON public.reseller_credits;

CREATE POLICY "Admins can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage reseller credits" ON public.reseller_credits
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own credits" ON public.reseller_credits
FOR SELECT TO authenticated USING (reseller_id = auth.uid());


-- === FILE: 20260305233839_2d98bb8b-d5cd-4f5d-b7a8-bffe07fea58e.sql ===
-- Clear all existing device bindings so users can re-activate with the new HWID format (User-Agent only, no IP)
DELETE FROM public.devices;

-- === FILE: 20260305235546_7637a46b-0d9c-4fda-9116-4719d9b66cf1.sql ===

-- Allow managers to read/update system_config
CREATE POLICY "Managers can view config"
ON public.system_config FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update config"
ON public.system_config FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert config"
ON public.system_config FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete config"
ON public.system_config FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow resellers to read pricing config (keys starting with 'reseller_')
CREATE POLICY "Resellers can view reseller config"
ON public.system_config FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'reseller'::app_role)
  AND key LIKE 'reseller_%'
);


-- === FILE: 20260306030552_331e6359-e13c-49c6-b2b2-d9885c83551b.sql ===
ALTER TABLE public.reseller_profiles ADD COLUMN plan_type text NOT NULL DEFAULT '197';

-- === FILE: 20260306145351_b453d1d6-17d8-4a20-bf00-bb182fa1ecce.sql ===
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS max_messages integer DEFAULT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS messages_used integer NOT NULL DEFAULT 0;

-- === FILE: 20260310014637_18c98944-1bc7-427b-9603-a04fbd0d6350.sql ===

CREATE TABLE public.credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL,
  quantity integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pagseguro_order_id text,
  qr_code_text text,
  qr_code_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own orders"
ON public.credit_orders FOR SELECT
TO authenticated
USING (reseller_id = auth.uid());

CREATE POLICY "Admins can manage credit orders"
ON public.credit_orders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage credit orders"
ON public.credit_orders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Service role can manage credit orders"
ON public.credit_orders FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_credit_orders_updated_at
  BEFORE UPDATE ON public.credit_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- === FILE: 20260314023804_137f0431-7bc0-4f47-86e5-2fd9ffdec357.sql ===
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS document text;

-- === FILE: 20260314041951_bdfdeef1-40d4-48c5-9fb7-d32fc0d98b57.sql ===
UPDATE system_config SET value = '45', updated_at = now() WHERE key = 'reseller_key_tier_197_1_price';

-- === FILE: 20260316081011_3e25a3a7-4f83-456f-9069-58aa2fb91062.sql ===
UPDATE system_config SET value = '39.90', updated_at = now() WHERE key = 'reseller_key_tier_197_1_price';

-- === FILE: 20260316225526_019b832a-6e8e-4e4b-b430-27403b45284a.sql ===
DROP POLICY IF EXISTS "Service role can manage test_license_ips" ON public.test_license_ips;

CREATE POLICY "Service role can manage test_license_ips"
ON public.test_license_ips
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- === FILE: 20260317052213_5f42bdef-570d-4c0e-b3e6-8ae57a7329b7.sql ===
UPDATE system_config SET value = '37.90', updated_at = now() WHERE key = 'reseller_key_tier_197_2_price';
UPDATE system_config SET value = '35.90', updated_at = now() WHERE key = 'reseller_key_tier_197_3_price';

-- === FILE: 20260321200332_a3fc5435-6cc7-41e8-93a7-51184a55d4ee.sql ===

-- Allow admins and managers to delete sessions (needed for device reset)
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;
DROP POLICY IF EXISTS "Managers can delete sessions" ON public.sessions;
CREATE POLICY "Admins can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Allow admins and managers to delete license_logs (needed for license deletion)
DROP POLICY IF EXISTS "No one can delete logs" ON public.license_logs;
DROP POLICY IF EXISTS "Admins can delete logs" ON public.license_logs;
DROP POLICY IF EXISTS "Managers can delete logs" ON public.license_logs;
CREATE POLICY "Admins can delete logs" ON public.license_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can delete logs" ON public.license_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));


-- === FILE: 20260321210147_253cb00b-9c3c-4b23-b4c2-21275d368b2f.sql ===
ALTER TABLE public.token_pool ADD COLUMN IF NOT EXISTS refresh_token text;

-- === FILE: 20260321210354_c5f9d2cf-70ed-424d-94f6-7c65c2c8eda0.sql ===
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- === FILE: 20260321213302_2a0dc8f2-fd25-4d42-98c7-e7be0faf5dd4.sql ===
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- === FILE: 20260321213657_3869c737-7418-4a75-b51e-ff3e62da8218.sql ===
CREATE TABLE public.token_refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.token_pool(id) ON DELETE CASCADE,
  account_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'success',
  error_message text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view refresh logs" ON public.token_refresh_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage refresh logs" ON public.token_refresh_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_token_refresh_logs_created ON public.token_refresh_logs(created_at DESC);
CREATE INDEX idx_token_refresh_logs_status ON public.token_refresh_logs(status);

-- === FILE: 20260322133605_a3a1531b-fe7e-4afd-9fd6-9a8ac774645a.sql ===
CREATE POLICY "Resellers can delete own devices"
ON public.devices
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = devices.license_id
      AND licenses.created_by = auth.uid()
  )
);

CREATE POLICY "Resellers can delete own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = sessions.license_id
      AND licenses.created_by = auth.uid()
  )
);

-- === FILE: 20260322142745_2b920283-2f84-4f60-968c-a83b10b059ce.sql ===
CREATE TABLE public.token_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  function_name text DEFAULT 'unknown',
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL
);

ALTER TABLE public.token_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage token_metrics" ON public.token_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view token_metrics" ON public.token_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can view token_metrics" ON public.token_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX idx_token_metrics_created_at ON public.token_metrics(created_at DESC);
CREATE INDEX idx_token_metrics_provider ON public.token_metrics(provider);

-- === FILE: 20260323040407_eb6332bb-555d-4fb1-a19d-d3eb84e9772d.sql ===
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'apollo';

-- === FILE: 20260323040424_5c7ce13d-1ccc-4871-a390-b38bcf0a64dc.sql ===

-- RLS policies for apollo on licenses (only see their own created licenses)
CREATE POLICY "Apollo can view own licenses" ON public.licenses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
CREATE POLICY "Apollo can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
CREATE POLICY "Apollo can update own licenses" ON public.licenses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());
CREATE POLICY "Apollo can delete own licenses" ON public.licenses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- RLS for devices
CREATE POLICY "Apollo can view own devices" ON public.devices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can insert own devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can update own devices" ON public.devices FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can delete own devices" ON public.devices FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = devices.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- RLS for sessions
CREATE POLICY "Apollo can delete own sessions" ON public.sessions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = sessions.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- RLS for license_logs
CREATE POLICY "Apollo can view own license logs" ON public.license_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can insert own license logs" ON public.license_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_logs.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));

-- RLS for system_config, templates, wildcard_usage, token_metrics
CREATE POLICY "Apollo can view config" ON public.system_config FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can view templates" ON public.templates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can view own wildcard usage" ON public.wildcard_usage FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM licenses WHERE licenses.id = wildcard_usage.license_id AND licenses.created_by = auth.uid()) AND has_role(auth.uid(), 'apollo'::app_role));
CREATE POLICY "Apollo can view own token metrics" ON public.token_metrics FOR SELECT TO authenticated USING (has_role(auth.uid(), 'apollo'::app_role) AND (license_id IS NULL OR EXISTS (SELECT 1 FROM licenses WHERE licenses.id = token_metrics.license_id AND licenses.created_by = auth.uid())));


-- === FILE: 20260323202525_fc0c0011-eb71-49aa-b7ce-158d0fe21691.sql ===
ALTER TABLE public.reseller_profiles ADD COLUMN custom_key_price numeric DEFAULT NULL;

-- === FILE: 20260324124926_14844ca6-2277-4abf-b27d-f16cdf730a8a.sql ===

-- Add created_by column to reseller_profiles
ALTER TABLE public.reseller_profiles ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Apollo can SELECT reseller_profiles they created
CREATE POLICY "Apollo can view own reseller profiles"
ON public.reseller_profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- Apollo can UPDATE reseller_profiles they created
CREATE POLICY "Apollo can update own reseller profiles"
ON public.reseller_profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- Apollo can DELETE reseller_profiles they created
CREATE POLICY "Apollo can delete own reseller profiles"
ON public.reseller_profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND created_by = auth.uid());

-- Apollo can manage reseller_credits for their resellers
CREATE POLICY "Apollo can manage own reseller credits"
ON public.reseller_credits FOR ALL TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND EXISTS (
  SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = reseller_credits.reseller_id AND reseller_profiles.created_by = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'apollo'::app_role) AND EXISTS (
  SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = reseller_credits.reseller_id AND reseller_profiles.created_by = auth.uid()
));

-- Apollo can manage user_roles for resellers they created
CREATE POLICY "Apollo can delete reseller roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'apollo'::app_role) AND role = 'reseller'::app_role AND EXISTS (
  SELECT 1 FROM reseller_profiles WHERE reseller_profiles.user_id = user_roles.user_id AND reseller_profiles.created_by = auth.uid()
));


-- === FILE: 20260324133935_de33417d-979c-4592-ad43-cfd26e3d8722.sql ===
ALTER TABLE public.reseller_profiles ADD COLUMN deadline_at timestamp with time zone DEFAULT NULL;

-- === FILE: 20260324134110_04eab984-4f9f-4548-8808-f4338566879f.sql ===
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- === FILE: 20260326010651_f0dd4c58-b477-47d7-91fe-49d0bd0af730.sql ===

-- Fix: Change wildcard_usage "Service role can manage" policy from public to service_role
DROP POLICY IF EXISTS "Service role can manage wildcard usage" ON public.wildcard_usage;

CREATE POLICY "Service role can manage wildcard usage"
ON public.wildcard_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- === FILE: 20260326151743_a7315b1f-f999-4e66-ae49-e07953aa6b35.sql ===
UPDATE public.system_config SET value = 'https://n8n.projetocode.com.br/webhook/mateus-lovable', updated_at = now() WHERE key = 'n8n_webhook_url';

-- === FILE: 20260326165601_d748c1e2-7bbf-4732-975d-a2fe978a0aed.sql ===
UPDATE system_config SET value = '29.90', updated_at = now() WHERE key = 'reseller_key_tier_297_1_price';
UPDATE system_config SET value = '29.90', updated_at = now() WHERE key = 'reseller_key_tier_297_2_price';
UPDATE system_config SET value = '29.90', updated_at = now() WHERE key = 'reseller_key_tier_297_3_price';

-- === FILE: 20260326165609_3eedd504-12c9-48d4-b993-d257292cc7ee.sql ===
UPDATE system_config SET value = '49.90', updated_at = now() WHERE key = 'reseller_key_tier_197_1_price';
UPDATE system_config SET value = '49.90', updated_at = now() WHERE key = 'reseller_key_tier_197_2_price';
UPDATE system_config SET value = '49.90', updated_at = now() WHERE key = 'reseller_key_tier_197_3_price';

-- === FILE: 20260326204208_dba052ca-26fe-4bb8-9aa4-7d1048175c3d.sql ===
UPDATE system_config SET value = '49.90', updated_at = now() WHERE key IN ('reseller_key_tier_197_1_price', 'reseller_key_tier_197_2_price', 'reseller_key_tier_197_3_price');

-- === FILE: 20260327001812_ad373cec-ef6a-40e3-9048-87af32c3b72e.sql ===
-- 1. Fix CRITICAL: reseller_profiles self-insert allows setting admin-only fields
DROP POLICY IF EXISTS "Users can insert own reseller profile" ON public.reseller_profiles;

CREATE POLICY "Users can insert own reseller profile"
ON public.reseller_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND custom_key_price IS NULL
  AND created_by IS NULL
);

-- 2. Fix WARN: Resellers can view licenses without role check
DROP POLICY IF EXISTS "Resellers can view own licenses" ON public.licenses;

CREATE POLICY "Resellers can view own licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'reseller'::app_role)
  AND created_by = auth.uid()
);

-- === FILE: 20260327014330_18bb033e-b7aa-49a7-b163-bc81a888fdb1.sql ===
UPDATE system_config 
SET value = regexp_replace(
  regexp_replace(
    value,
    '\.input-actions \{ display: flex; align-items: center; gap: 4px; flex-shrink: 0; \}\n\.send-btn \{',
    '.input-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.attach-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; color: var(--text-secondary);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s ease;
}
.attach-btn:hover { color: var(--accent); }
.file-preview {
  display: none; flex-wrap: wrap; gap: 6px;
  padding: 6px 14px 0;
}
.file-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 8px;
  background: var(--accent-glow); border: 1px solid var(--border);
  font-size: 11px; color: var(--text-secondary);
}
.file-chip button {
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px;
}
.file-chip button:hover { color: var(--red); }
.send-btn {'
  ),
  '<div class="input-area">\n    <div class="input-wrapper">\n      <textarea id="message"',
  '<div class="input-area">
    <input type="file" id="fileInput" multiple style="display:none">
    <div id="filePreview" class="file-preview"></div>
    <div class="input-wrapper">
      <button class="attach-btn" id="attachBtn" title="Anexar arquivo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <textarea id="message"'
)
WHERE key = 'extension_front_html';

-- === FILE: 20260327014836_759d98db-a6c3-4a4c-a5e5-f331b2c1f070.sql ===
UPDATE system_config 
SET value = replace(
  value,
  'padding: 0; outline: none;
}',
  'padding: 0; outline: none;
  overflow-y: hidden;
  transition: height 0.1s ease;
}'
)
WHERE key = 'extension_front_html' AND value NOT LIKE '%overflow-y: hidden%';

-- === FILE: 20260327015254_e5e65a2b-d2bd-443c-b5f2-40900c5f728d.sql ===
UPDATE system_config 
SET value = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            value,
            'padding: 14px 16px;',
            'padding: 10px 12px;'
          ),
          'background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.header-logo { height: 14px; border-radius: 10px; object-fit: contain; margin-left: 8px; }
.header-right { display: flex; align-items: center; gap: 8px; }',
          'background: linear-gradient(180deg, rgba(139,92,246,0.08) 0%, var(--bg-secondary) 100%);
  border-bottom: 1px solid var(--border);
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-logo { height: 16px; border-radius: 10px; object-fit: contain; }
.header-right { display: flex; align-items: center; gap: 6px; }'
        ),
        'background: rgba(48,209,88,0.12);
  font-size: 11px; font-weight: 600; color: var(--green);
}
.license-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }',
        'background: rgba(48,209,88,0.1);
  font-size: 10px; font-weight: 600; color: var(--green);
  border: 1px solid rgba(48,209,88,0.15);
}
.license-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--green);
  box-shadow: 0 0 6px rgba(48,209,88,0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(48,209,88,0.6); }
  50% { opacity: 0.6; box-shadow: 0 0 2px rgba(48,209,88,0.3); }
}'
      ),
      'padding: 6px 16px; border-radius: 100px;
  background: var(--accent); color: white;
  font-size: 13px; font-weight: 600;
  border: none; cursor: pointer;
  transition: opacity 0.15s ease;
}
.publish-btn:hover { opacity: 0.85; }',
      'padding: 5px 14px; border-radius: 100px;
  background: linear-gradient(135deg, var(--accent), #A78BFA);
  color: white;
  font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
  border: none; cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}
.publish-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.35); }
.publish-btn:active { transform: translateY(0); }'
    ),
    'width: 32px; height: 32px; border-radius: 8px;
  background: transparent; border: none;',
    'width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid transparent;'
  ),
  '.icon-btn:hover { background: var(--bg-tertiary); color: var(--text); }
.icon-btn.danger:hover { color: var(--red); }',
  '.icon-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--border); color: var(--text); }
.icon-btn.danger:hover { color: var(--red); background: rgba(255,69,58,0.08); border-color: rgba(255,69,58,0.15); }'
)
WHERE key = 'extension_front_html';

-- === FILE: 20260327041350_ec817a3e-dfbf-4510-bff6-f309707d2b39.sql ===
-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Allow service role to insert
CREATE POLICY "Service role insert for message attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-attachments');

-- === FILE: 20260328062521_d259953b-113c-4c42-9f19-2444092439e8.sql ===
UPDATE reseller_profiles SET custom_key_price = NULL WHERE user_id = '986a3dfb-c747-490e-b194-f18eb38da7b3' AND plan_type = '197';

-- === FILE: 20260329161444_e4380e1d-50ab-4378-95fc-84e8174d7470.sql ===
-- Fix 1: Add SELECT policies to sessions table (currently missing, exposing session_token/hwid)
CREATE POLICY "Admins can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own sessions"
ON public.sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM licenses
  WHERE licenses.id = sessions.license_id
  AND licenses.created_by = auth.uid()
));

CREATE POLICY "Apollo can view own sessions"
ON public.sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = sessions.license_id
    AND licenses.created_by = auth.uid()
  ) AND has_role(auth.uid(), 'apollo'::app_role)
);

-- Fix 2: Add restrictive INSERT policy on user_roles to ensure only admin/manager can insert
-- First, block all INSERT for non-privileged users with an explicit deny
CREATE POLICY "Only admins and managers can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'apollo'::app_role)
);

-- === FILE: 20260331010016_4838514e-defc-43e7-865f-a8ea72eb05ae.sql ===
-- Allow Apollo to view own credit orders
CREATE POLICY "Apollo can view own credit orders"
  ON public.credit_orders
  FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Allow Apollo to insert own credit orders
CREATE POLICY "Apollo can insert own credit orders"
  ON public.credit_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (reseller_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Allow Apollo to view own reseller profile
CREATE POLICY "Apollo can view own reseller profile"
  ON public.reseller_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Allow Apollo to view own credits  
CREATE POLICY "Apollo can view own reseller credits"
  ON public.reseller_credits
  FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- === FILE: 20260331020333_e9b8aa03-5e24-4ca5-8626-40a8703c7dc7.sql ===

-- Table to store Apollo admin's HooPay credentials for split payments
CREATE TABLE public.apollo_hoopay_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  hoopay_username text NOT NULL DEFAULT '',
  hoopay_password text NOT NULL DEFAULT '',
  organization_uuid text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apollo_hoopay_config ENABLE ROW LEVEL SECURITY;

-- Apollo admins can manage their own config
CREATE POLICY "Apollo can view own hoopay config" ON public.apollo_hoopay_config
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

CREATE POLICY "Apollo can insert own hoopay config" ON public.apollo_hoopay_config
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

CREATE POLICY "Apollo can update own hoopay config" ON public.apollo_hoopay_config
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'apollo'::app_role));

-- Admins can view all configs
CREATE POLICY "Admins can view all hoopay config" ON public.apollo_hoopay_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "Service role can manage hoopay config" ON public.apollo_hoopay_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- === FILE: 20260331020526_9a257ae9-5618-4dcb-aa5d-fdfec5300abf.sql ===

INSERT INTO public.system_config (key, value, description)
VALUES 
  ('master_hoopay_organization_uuid', '', 'UUID da organizaÃ§Ã£o master no HooPay para receber split dos Apollo admins'),
  ('master_hoopay_affiliate_id', '', 'ID de afiliado master no HooPay para split')
ON CONFLICT DO NOTHING;


-- === FILE: 20260331021407_2f66780a-6b3f-4214-8a33-aa9e97332854.sql ===

ALTER TABLE public.apollo_hoopay_config 
  RENAME COLUMN hoopay_username TO client_id;
ALTER TABLE public.apollo_hoopay_config 
  RENAME COLUMN hoopay_password TO client_secret;


-- === FILE: 20260401032553_f31f664f-affe-42dc-abd1-e144394f30f6.sql ===
CREATE OR REPLACE FUNCTION public.update_expired_licenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark active licenses as expired
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  -- Auto-delete expired test licenses (max_messages IS NOT NULL)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired'
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired'
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired'
  );
  DELETE FROM public.licenses WHERE max_messages IS NOT NULL AND status = 'expired';
END;
$function$;

-- === FILE: 20260401144927_877377ca-b8f5-450b-9df3-3a3ae767c397.sql ===

CREATE OR REPLACE FUNCTION public.update_expired_licenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark active licenses as expired
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  -- Auto-delete expired test licenses (max_messages IS NOT NULL OR duration_hours <= 0.17)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (max_messages IS NOT NULL OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (max_messages IS NOT NULL OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (max_messages IS NOT NULL OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
  );
  DELETE FROM public.licenses WHERE status = 'expired' AND (max_messages IS NOT NULL OR (duration_hours IS NOT NULL AND duration_hours <= 0.17));
END;
$function$;


-- === FILE: 20260401151805_cd473430-0fa0-41ec-bae6-443406f33b0e.sql ===
CREATE OR REPLACE FUNCTION public.update_expired_licenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark active licenses as expired
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  -- Auto-delete expired test licenses:
  -- 1. TESTE- prefix keys
  -- 2. duration_hours <= 0.17 (10 min)
  -- 3. max_messages IS NOT NULL (legacy)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.licenses WHERE status = 'expired' AND (
    license_key LIKE 'TESTE-%' OR
    max_messages IS NOT NULL OR 
    (duration_hours IS NOT NULL AND duration_hours <= 0.17)
  );
END;
$function$;

-- === FILE: 20260403150815_e69b8a3f-ae1b-4cef-ba2b-8d35c4235366.sql ===

CREATE TABLE public.lvb_credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL,
  external_order_id text,
  creditos integer NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  link_cliente text,
  email_bot text,
  workspace_id text,
  workspace_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lvb_credit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own lvb orders"
  ON public.lvb_credit_orders FOR SELECT TO authenticated
  USING (reseller_id = auth.uid());

CREATE POLICY "Resellers can insert own lvb orders"
  ON public.lvb_credit_orders FOR INSERT TO authenticated
  WITH CHECK (reseller_id = auth.uid());

CREATE POLICY "Resellers can update own lvb orders"
  ON public.lvb_credit_orders FOR UPDATE TO authenticated
  USING (reseller_id = auth.uid());

CREATE POLICY "Admins can manage all lvb orders"
  ON public.lvb_credit_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all lvb orders"
  ON public.lvb_credit_orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));


-- === FILE: 20260403152610_2b5abaf2-5d6b-4533-a279-9524ed50dc32.sql ===
ALTER TABLE public.lvb_credit_orders 
ADD COLUMN IF NOT EXISTS payment_order_id text,
ADD COLUMN IF NOT EXISTS pix_qr_code text,
ADD COLUMN IF NOT EXISTS pix_code_text text;

-- === FILE: 20260403170056_414e611e-42b2-4bdd-b4f7-7d1552e9a038.sql ===
CREATE POLICY "Resellers can view lvb package prices"
ON public.system_config
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'reseller'::app_role) AND key LIKE 'lvb_package_%'
);

-- === FILE: 20260406232220_203049d2-bbf7-4352-8f49-54d63b1e0787.sql ===

CREATE TABLE public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  blocked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.security_audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage audit logs" ON public.security_audit_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_security_audit_logs_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX idx_security_audit_logs_user ON public.security_audit_logs(user_id);


-- === FILE: 20260407021828_221693d0-34aa-436d-8088-3a78b4d7afa5.sql ===

-- Create apollo_syncpay_config table for Apollo admin SyncPay credentials
CREATE TABLE public.apollo_syncpay_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL DEFAULT '',
  client_secret TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.apollo_syncpay_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own syncpay config"
  ON public.apollo_syncpay_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own syncpay config"
  ON public.apollo_syncpay_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own syncpay config"
  ON public.apollo_syncpay_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- === FILE: 20260407031753_a54f2b0c-4986-4ddb-a458-2e5b83bc2a2d.sql ===
ALTER TABLE public.credit_orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_document text;

-- === FILE: 20260407033630_82f6e465-fc90-48c5-b596-9498f329519c.sql ===
UPDATE system_config SET value = '1.00', updated_at = now() WHERE key = 'reseller_key_tier_197_1_price';

-- === FILE: 20260407033927_6d91933c-dc59-4e63-8ad7-7a5ba1e02d70.sql ===
UPDATE system_config SET value = '49.90', updated_at = now() WHERE key = 'reseller_key_tier_197_1_price';

-- === FILE: 20260413004630_eb4022e2-c452-4e6f-8eaf-ecaa9ce7ecec.sql ===
ALTER TABLE public.licenses ADD COLUMN last_message_at TIMESTAMPTZ;

-- === FILE: 20260413142148_5aa06de5-f405-48ea-9630-331fa9b5691c.sql ===

-- Fix 1: Add admin and delete policies to apollo_syncpay_config
CREATE POLICY "Admins can manage all syncpay config"
ON public.apollo_syncpay_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own syncpay config"
ON public.apollo_syncpay_config
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix 2: Drop and recreate apollo token_metrics policy to exclude NULL license_id leak
DROP POLICY IF EXISTS "Apollo can view own token metrics" ON public.token_metrics;

CREATE POLICY "Apollo can view own token metrics"
ON public.token_metrics
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'apollo'::app_role)
  AND license_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = token_metrics.license_id
    AND licenses.created_by = auth.uid()
  )
);


-- === FILE: 20260417062934_6c96d6db-7450-42be-beb2-de66958746cb.sql ===
DELETE FROM public.system_config WHERE key IN ('lvb_package_10', 'lvb_package_50');

-- === FILE: 20260420185648_f4dbd632-6181-437b-8ab4-1dd0557f9e1f.sql ===
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'credits_customer';

-- === FILE: 20260420185720_baba07b6-008b-4918-9d28-5d67c5b1829b.sql ===
-- Tabela credits_customers
CREATE TABLE IF NOT EXISTS public.credits_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credits_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits customer profile"
  ON public.credits_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits customer profile"
  ON public.credits_customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits customer profile"
  ON public.credits_customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits customers"
  ON public.credits_customers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all credits customers"
  ON public.credits_customers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_credits_customers_updated_at
  BEFORE UPDATE ON public.credits_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna source em lvb_credit_orders
ALTER TABLE public.lvb_credit_orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'reseller_panel';

CREATE INDEX IF NOT EXISTS idx_lvb_credit_orders_source ON public.lvb_credit_orders(source);

-- PolÃ­ticas para credits_customer em lvb_credit_orders
CREATE POLICY "Credits customers can insert own lvb orders"
  ON public.lvb_credit_orders FOR INSERT
  TO authenticated
  WITH CHECK (reseller_id = auth.uid() AND public.has_role(auth.uid(), 'credits_customer'::app_role));

CREATE POLICY "Credits customers can view own lvb orders"
  ON public.lvb_credit_orders FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid() AND public.has_role(auth.uid(), 'credits_customer'::app_role));

CREATE POLICY "Credits customers can update own lvb orders"
  ON public.lvb_credit_orders FOR UPDATE
  TO authenticated
  USING (reseller_id = auth.uid() AND public.has_role(auth.uid(), 'credits_customer'::app_role));

-- PolÃ­tica para leitura de preÃ§os creditos_pkg_*
CREATE POLICY "Credits customers can view creditos package prices"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'credits_customer'::app_role) AND key LIKE 'creditos_pkg_%');

-- Seed dos preÃ§os padrÃ£o
INSERT INTO public.system_config (key, value, description) VALUES
  ('creditos_pkg_10', '1.90', 'PreÃ§o pacote 10 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_50', '5.90', 'PreÃ§o pacote 50 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_100', '8.90', 'PreÃ§o pacote 100 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_200', '16.90', 'PreÃ§o pacote 200 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_300', '23.90', 'PreÃ§o pacote 300 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_500', '38.90', 'PreÃ§o pacote 500 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_1000', '74.90', 'PreÃ§o pacote 1000 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_2000', '143.90', 'PreÃ§o pacote 2000 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_3000', '209.90', 'PreÃ§o pacote 3000 crÃ©ditos (pÃ¡gina pÃºblica /creditos)'),
  ('creditos_pkg_5000', '339.90', 'PreÃ§o pacote 5000 crÃ©ditos (pÃ¡gina pÃºblica /creditos)')
ON CONFLICT (key) DO NOTHING;

-- === FILE: 20260420221238_ce90dc42-4a51-4caf-abfe-427e8fb4412c.sql ===
-- Atualizar a URL do webhook n8n
UPDATE system_config 
SET value = 'https://primary-production-ca741.up.railway.app/webhook/lov2.0',
    updated_at = now()
WHERE key = 'n8n_webhook_url';

-- Se nÃ£o existir, criar o registro
INSERT INTO system_config (key, value, description)
SELECT 'n8n_webhook_url', 'https://primary-production-ca741.up.railway.app/webhook/lov2.0', 'URL do webhook n8n para processamento de mensagens'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'n8n_webhook_url');

-- === FILE: 20260421011702_074f1688-f0c1-4277-8099-87366c8f53fd.sql ===
-- Limpa devices e sessions com HWIDs SRV2- falsos (gerados a partir do User-Agent do servidor n8n,
-- nÃ£o do dispositivo real do usuÃ¡rio). ApÃ³s a correÃ§Ã£o do validate-license-v2, os usuÃ¡rios
-- re-registrarÃ£o automaticamente com o HWID real encaminhado pelo n8n.
DELETE FROM public.sessions WHERE hwid LIKE 'SRV2-%';
DELETE FROM public.devices WHERE hwid LIKE 'SRV2-%';

-- === FILE: 20260422143042_fd1b0b10-bee1-48d8-af5f-a381e773c8df.sql ===

UPDATE public.reseller_profiles
SET 
  status = 'approved',
  approved_at = now()
WHERE status = 'pending';


-- === FILE: 20260422172415_8a96cdfd-0081-4c57-a81a-4fe0f54d0273.sql ===
-- DiagnÃ³stico: localizar cadastro do matheus_resendedf e copiar resultado para um log temporÃ¡rio
DO $$
DECLARE
  rec RECORD;
  result_text TEXT := '';
BEGIN
  FOR rec IN 
    SELECT 
      u.id, 
      u.email, 
      u.created_at, 
      u.email_confirmed_at IS NOT NULL as confirmed,
      u.raw_app_meta_data->>'provider' as provider,
      (SELECT string_agg(role::text, ',') FROM public.user_roles WHERE user_id = u.id) as roles,
      EXISTS(SELECT 1 FROM public.reseller_profiles WHERE user_id = u.id) as has_profile
    FROM auth.users u
    WHERE u.email ILIKE '%resendedf%' OR u.email ILIKE '%matheus_resende%'
    ORDER BY u.created_at DESC
  LOOP
    result_text := result_text || format(
      'EMAIL=%s | ID=%s | created=%s | confirmed=%s | provider=%s | roles=%s | profile=%s; ',
      rec.email, rec.id, rec.created_at, rec.confirmed, COALESCE(rec.provider, 'email'), COALESCE(rec.roles, 'NONE'), rec.has_profile
    );
  END LOOP;
  
  IF result_text = '' THEN
    RAISE NOTICE 'NENHUM USUÃRIO ENCONTRADO com email contendo resendedf ou matheus_resende';
  ELSE
    RAISE NOTICE 'RESULTADO: %', result_text;
  END IF;
END $$;

-- === FILE: 20260422172431_07f676ec-2322-4c42-9d08-4b6d1cdd69af.sql ===
DROP TABLE IF EXISTS public._tmp_diag_user;
CREATE TABLE public._tmp_diag_user AS
SELECT 
  u.id, 
  u.email, 
  u.created_at, 
  (u.email_confirmed_at IS NOT NULL) as confirmed,
  u.raw_app_meta_data->>'provider' as provider,
  (SELECT string_agg(role::text, ',') FROM public.user_roles WHERE user_id = u.id) as roles,
  EXISTS(SELECT 1 FROM public.reseller_profiles WHERE user_id = u.id) as has_profile
FROM auth.users u
WHERE u.email ILIKE '%resendedf%' OR u.email ILIKE '%matheus_resende%' OR u.email ILIKE '%resende_df%'
ORDER BY u.created_at DESC;

-- RLS para evitar warnings: apenas admin pode ver
ALTER TABLE public._tmp_diag_user ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_admin_only" ON public._tmp_diag_user FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- === FILE: 20260422172752_4da64449-43cf-4f0e-832c-583de4643980.sql ===
DROP TABLE IF EXISTS public._tmp_diag_user;

-- === FILE: 20260424192837_9c7e54ee-1e21-4e80-8790-f6b3d6f9d5e6.sql ===
-- Tabela para rastrear IPs Ãºnicos que validam cada licenÃ§a
CREATE TABLE public.license_ip_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  hwid TEXT,
  access_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(license_id, ip_address)
);

CREATE INDEX idx_license_ip_tracking_license ON public.license_ip_tracking(license_id);
CREATE INDEX idx_license_ip_tracking_last_seen ON public.license_ip_tracking(last_seen_at DESC);

ALTER TABLE public.license_ip_tracking ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "Admins can view all ip tracking"
ON public.license_ip_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Gerentes veem tudo
CREATE POLICY "Managers can view all ip tracking"
ON public.license_ip_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Revendedores veem sÃ³ das prÃ³prias licenÃ§as
CREATE POLICY "Resellers can view own license ip tracking"
ON public.license_ip_tracking
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.licenses
  WHERE licenses.id = license_ip_tracking.license_id
    AND licenses.created_by = auth.uid()
));

-- Service role gerencia tudo
CREATE POLICY "Service role can manage ip tracking"
ON public.license_ip_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- FunÃ§Ã£o para registrar IP e detectar abuso
-- Retorna true se a licenÃ§a foi revogada por abuso, false caso contrÃ¡rio
CREATE OR REPLACE FUNCTION public.register_license_ip(
  _license_id UUID,
  _ip_address TEXT,
  _user_agent TEXT DEFAULT NULL,
  _hwid TEXT DEFAULT NULL,
  _max_unique_ips INTEGER DEFAULT 1,
  _window_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unique_ips INTEGER;
  _is_wildcard BOOLEAN;
  _current_status TEXT;
  _ip_list TEXT[];
BEGIN
  -- NÃ£o rastrear IPs para licenÃ§as wildcard (sÃ£o intencionalmente multi-IP)
  SELECT is_wildcard, status INTO _is_wildcard, _current_status
  FROM public.licenses WHERE id = _license_id;

  IF _is_wildcard THEN
    RETURN jsonb_build_object('revoked', false, 'reason', 'wildcard_skip');
  END IF;

  -- Se jÃ¡ estiver revogada, nÃ£o fazer nada
  IF _current_status = 'revoked' THEN
    RETURN jsonb_build_object('revoked', true, 'reason', 'already_revoked');
  END IF;

  -- Upsert do IP atual
  INSERT INTO public.license_ip_tracking (license_id, ip_address, user_agent, hwid)
  VALUES (_license_id, _ip_address, _user_agent, _hwid)
  ON CONFLICT (license_id, ip_address) DO UPDATE
  SET access_count = license_ip_tracking.access_count + 1,
      last_seen_at = now(),
      user_agent = COALESCE(EXCLUDED.user_agent, license_ip_tracking.user_agent),
      hwid = COALESCE(EXCLUDED.hwid, license_ip_tracking.hwid);

  -- Contar IPs Ãºnicos na janela de tempo
  SELECT COUNT(DISTINCT ip_address), array_agg(DISTINCT ip_address)
  INTO _unique_ips, _ip_list
  FROM public.license_ip_tracking
  WHERE license_id = _license_id
    AND last_seen_at >= now() - (_window_hours || ' hours')::INTERVAL
    AND ip_address != 'unknown';

  -- Se exceder limite, revogar automaticamente
  IF _unique_ips > _max_unique_ips THEN
    UPDATE public.licenses
    SET status = 'revoked',
        revoked_at = now()
    WHERE id = _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (
      _license_id,
      'auto_revoked_ip_abuse',
      jsonb_build_object(
        'unique_ips', _unique_ips,
        'limit', _max_unique_ips,
        'window_hours', _window_hours,
        'ips', _ip_list,
        'triggered_by_ip', _ip_address
      )
    );

    RETURN jsonb_build_object(
      'revoked', true,
      'reason', 'ip_abuse',
      'unique_ips', _unique_ips,
      'ips', _ip_list
    );
  END IF;

  RETURN jsonb_build_object('revoked', false, 'unique_ips', _unique_ips);
END;
$$;

-- === FILE: 20260424200056_f9b76ee5-8260-4268-960f-8a59b0a9bd2f.sql ===
-- Tabela para rastrear projetos Lovable Ãºnicos por licenÃ§a
CREATE TABLE IF NOT EXISTS public.license_project_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (license_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_lpt_license_lastseen ON public.license_project_tracking(license_id, last_seen_at DESC);

ALTER TABLE public.license_project_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: admins/managers veem tudo, resellers veem sÃ³ suas licenÃ§as, service_role gerencia
CREATE POLICY "Admins can view all project tracking"
  ON public.license_project_tracking FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all project tracking"
  ON public.license_project_tracking FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Resellers can view own project tracking"
  ON public.license_project_tracking FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licenses
    WHERE licenses.id = license_project_tracking.license_id
      AND licenses.created_by = auth.uid()
  ));

CREATE POLICY "Service role can manage project tracking"
  ON public.license_project_tracking FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- FunÃ§Ã£o: registra projeto e auto-revoga se exceder N projetos Ãºnicos em janela de tempo
CREATE OR REPLACE FUNCTION public.register_license_project(
  _license_id UUID,
  _project_id TEXT,
  _max_unique_projects INTEGER DEFAULT 2,
  _window_seconds INTEGER DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unique_projects INTEGER;
  _is_wildcard BOOLEAN;
  _current_status TEXT;
  _project_list TEXT[];
BEGIN
  -- Skip wildcard licenses (multi-tenant intencional)
  SELECT is_wildcard, status INTO _is_wildcard, _current_status
  FROM public.licenses WHERE id = _license_id;

  IF _is_wildcard THEN
    RETURN jsonb_build_object('revoked', false, 'reason', 'wildcard_skip');
  END IF;

  IF _current_status = 'revoked' THEN
    RETURN jsonb_build_object('revoked', true, 'reason', 'already_revoked');
  END IF;

  -- Upsert do projeto atual
  INSERT INTO public.license_project_tracking (license_id, project_id)
  VALUES (_license_id, _project_id)
  ON CONFLICT (license_id, project_id) DO UPDATE
    SET message_count = license_project_tracking.message_count + 1,
        last_seen_at = now();

  -- Conta projetos Ãºnicos na janela de tempo
  SELECT COUNT(DISTINCT project_id), array_agg(DISTINCT project_id)
  INTO _unique_projects, _project_list
  FROM public.license_project_tracking
  WHERE license_id = _license_id
    AND last_seen_at >= now() - (_window_seconds || ' seconds')::INTERVAL;

  IF _unique_projects > _max_unique_projects THEN
    UPDATE public.licenses
    SET status = 'revoked', revoked_at = now()
    WHERE id = _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (
      _license_id,
      'auto_revoked_project_abuse',
      jsonb_build_object(
        'unique_projects', _unique_projects,
        'limit', _max_unique_projects,
        'window_seconds', _window_seconds,
        'projects', _project_list,
        'triggered_by_project', _project_id
      )
    );

    RETURN jsonb_build_object(
      'revoked', true,
      'reason', 'project_abuse',
      'unique_projects', _unique_projects,
      'projects', _project_list
    );
  END IF;

  RETURN jsonb_build_object('revoked', false, 'unique_projects', _unique_projects);
END;
$$;

-- === FILE: 20260511225703_a376e97d-06f1-4bad-a82b-a53b890e80ce.sql ===

-- 1. message-attachments: explicit DELETE/UPDATE policies (service_role only)
CREATE POLICY "Service role can delete message-attachments"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'message-attachments');

CREATE POLICY "Service role can update message-attachments"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'message-attachments')
WITH CHECK (bucket_id = 'message-attachments');

-- 2. user_roles: RESTRICTIVE policy blocking self role assignment
CREATE POLICY "Block self role assignment"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id <> auth.uid());


-- === FILE: 20260513190600_5d0e0b7b-79ea-4a79-8999-a3d88d244c64.sql ===
UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'marketingepublicidade2.0@gmail.com' AND email_confirmed_at IS NULL;

-- === FILE: 20260515185413_df4f75d2-b86b-4df8-a0cd-4c384d40524a.sql ===
DELETE FROM auth.users WHERE id = '39dea214-0101-4e71-99f8-fa6f870a2167';
UPDATE auth.users SET email = 'jrspc.homeoffice@gmail.com', updated_at = now() WHERE id = '77858bcf-2f9b-413d-b403-f2e396c78515';

-- === FILE: 20260518190910_0cd713b0-1006-4e44-b14d-0d644b0abc40.sql ===
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL AND email NOT LIKE '%test.invalid';

-- === FILE: 20260519025616_f45c5882-592e-41e5-9445-47099ecc80c5.sql ===
UPDATE system_config
SET value = replace(
  value,
  '<div class="watermark-badge" id="removeWatermarkBtn">
    <button class="watermark-badge-cta">',
  '<div class="watermark-badge" id="removeWatermarkBtn" style="cursor:pointer" onclick="(function(){var t=document.getElementById(''message'');if(!t)return;t.value=''Adicione esse cÃ³digo no final do cÃ³digo do index.css : \n\n#lovable-badge { \n  display: none !important;\n}'';t.dispatchEvent(new Event(''input'',{bubbles:true}));t.focus();var b=document.getElementById(''sendBtn'');if(b)b.click();})()">
    <button class="watermark-badge-cta" type="button" onclick="event.stopPropagation();this.parentElement.click()">'
)
WHERE key='extension_front_html';

-- === FILE: 20260519035059_176f70b2-186c-4be7-bf26-07d2dd5e9142.sql ===
UPDATE system_config
SET value = replace(
  replace(
    value,
    'flex: 1; min-height: 22px; max-height: 120px;',
    'flex: 1; min-height: 60px; max-height: 200px;'
  ),
  E'padding: 0; outline: none;\n  overflow-y: hidden;',
  E'padding: 0; outline: none;\n  overflow-y: auto;\n  white-space: pre-wrap;\n  word-break: break-word;'
)
WHERE key = 'extension_front_html';

-- === FILE: 20260519135844_677b7ebd-d52d-4e28-9af6-39b1ac2af4e1.sql ===
UPDATE system_config SET value = replace(value, 'rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/public-assets/extension-banner.png?v=2', 'wvelcefgihlxcnrmslul.supabase.co/storage/v1/object/public/public-assets/extension-banner.png?v=3') WHERE key='extension_front_html';

-- === FILE: 20260519140244_5c990d86-5155-4ec3-9d8e-e4c20c7933e1.sql ===
UPDATE system_config SET value = replace(value, 'extension-banner.png?v=3', 'extension-banner.png?v=4') WHERE key='extension_front_html';

-- === FILE: 20260519141112_58020ae2-5dd1-4f5d-ba40-aa7aa26bf456.sql ===
UPDATE system_config SET value = replace(value, 'rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/public-assets/extension-logo.png', 'wvelcefgihlxcnrmslul.supabase.co/storage/v1/object/public/public-assets/extension-logo.png?v=3') WHERE key='extension_front_html';

-- === FILE: 20260519141805_a931ad56-bee3-4ed2-be36-fc0d42417c6b.sql ===
UPDATE system_config SET value = replace(
  value,
  '<button class="tab-btn" id="tabTemplates" data-tab="templates">Templates</button>',
  ''
) WHERE key='extension_front_html';

UPDATE system_config SET value = replace(
  value,
  '<div class="templates-container" id="templatesPanel"></div>',
  ''
) WHERE key='extension_front_html';

UPDATE system_config SET value = replace(
  value,
  '<div class="input-actions">
        <button class="send-btn" id="sendBtn">',
  '<div class="input-actions">
        <button class="enhance-btn" id="enhanceBtn" title="Melhorar prompt com IA"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg><span>Melhorar</span></button>
        <button class="send-btn" id="sendBtn">'
) WHERE key='extension_front_html';

UPDATE system_config SET value = replace(
  value,
  '.send-btn:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; opacity: 0.4; box-shadow: none; transform: none; }',
  '.send-btn:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; opacity: 0.4; box-shadow: none; transform: none; }
.enhance-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 100px; background: linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.08)); color: var(--accent); border: 1px solid rgba(139,92,246,0.35); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; }
.enhance-btn:hover { background: linear-gradient(135deg, rgba(139,92,246,0.32), rgba(139,92,246,0.18)); box-shadow: 0 2px 10px rgba(139,92,246,0.3); transform: translateY(-1px); }
.enhance-btn:disabled { opacity: 0.5; cursor: wait; transform: none; }
.enhance-btn.loading svg { animation: enhanceSpin 1s linear infinite; }
@keyframes enhanceSpin { to { transform: rotate(360deg); } }'
) WHERE key='extension_front_html';

-- === FILE: 20260519142937_98f1a045-5001-46c1-8ee2-38d4833bcc08.sql ===
UPDATE system_config
SET value = replace(replace(value, '<span>Melhorar</span>', '<span>Otimizar com IA</span>'), 'title="Melhorar prompt com IA"', 'title="Otimizar com IA"')
WHERE key = 'extension_front_html';

-- === FILE: 20260519144019_f7e7e1ec-a059-4d33-909e-44cad653d2eb.sql ===
UPDATE system_config
SET value = replace(
  replace(
    value,
    '<div id="filePreview" class="file-preview"></div>',
    '<div id="filePreview" class="file-preview"></div>' || E'\n' ||
    '    <div id="quickSuggestions" class="quick-suggestions"></div>'
  ),
  '@keyframes enhanceSpin { to { transform: rotate(360deg); } }',
  '@keyframes enhanceSpin { to { transform: rotate(360deg); } }' || E'\n\n' ||
  '/* Quick suggestions (captured from Lovable) */' || E'\n' ||
  '.quick-suggestions { display: none; flex-wrap: nowrap; gap: 6px; padding: 8px 12px 0; overflow-x: auto; scrollbar-width: none; }' || E'\n' ||
  '.quick-suggestions::-webkit-scrollbar { display: none; }' || E'\n' ||
  '.qs-chip { flex-shrink: 0; white-space: nowrap; padding: 6px 12px; height: 28px; border-radius: 100px; background: rgba(139,92,246,0.10); color: var(--text-primary); border: 1px solid rgba(139,92,246,0.30); font-size: 11.5px; font-weight: 500; cursor: pointer; transition: all 0.18s ease; }' || E'\n' ||
  '.qs-chip:hover { background: rgba(139,92,246,0.22); border-color: rgba(139,92,246,0.55); transform: translateY(-1px); }'
)
WHERE key = 'extension_front_html';

-- === FILE: 20260519194713_2068df9d-a221-4104-91f4-019f0f29853a.sql ===
DO $$
DECLARE
  _order_id uuid := '6d9e7a50-6e8e-4869-a3c3-f7f133f1bb6a';
  _reseller uuid;
  _key text;
  _license_id uuid;
BEGIN
  UPDATE public.credit_orders
  SET status = 'paid', paid_at = now()
  WHERE id = _order_id AND status <> 'paid'
  RETURNING reseller_id INTO _reseller;

  IF _reseller IS NULL THEN
    RAISE NOTICE 'Order already processed';
    RETURN;
  END IF;

  _key := public.generate_license_key();

  INSERT INTO public.licenses (license_key, email, expires_at, price, notes, created_by, status, is_wildcard)
  VALUES (_key, 'estoque', now() + interval '100 years', 0,
          'Chave em estoque - Pedido PIX #' || substring(_order_id::text, 1, 8) || ' (entrega manual)',
          _reseller, 'active', false)
  RETURNING id INTO _license_id;

  INSERT INTO public.license_logs (license_id, action, details)
  VALUES (_license_id, 'created', jsonb_build_object(
    'source', 'pix_purchase_manual_recovery',
    'order_id', _order_id,
    'created_by_reseller', _reseller
  ));
END $$;

-- === FILE: 20260519195058_5e0d258f-152e-4a78-9690-7d7ed6dc2527.sql ===
DO $$
DECLARE
  _order_id uuid;
  _reseller uuid;
  _key text;
  _license_id uuid;
  _ids uuid[] := ARRAY['9c523b81-0a79-430c-972c-cca7a58590ed','535d4236-a712-4e77-a083-4d044e94d2c3']::uuid[];
BEGIN
  FOREACH _order_id IN ARRAY _ids LOOP
    UPDATE public.credit_orders
    SET status = 'paid', paid_at = now()
    WHERE id = _order_id AND status <> 'paid'
    RETURNING reseller_id INTO _reseller;

    IF _reseller IS NULL THEN CONTINUE; END IF;

    _key := public.generate_license_key();
    INSERT INTO public.licenses (license_key, email, expires_at, price, notes, created_by, status, is_wildcard)
    VALUES (_key, 'estoque', now() + interval '100 years', 0,
            'Chave em estoque - Pedido PIX #' || substring(_order_id::text, 1, 8) || ' (entrega manual)',
            _reseller, 'active', false)
    RETURNING id INTO _license_id;

    INSERT INTO public.license_logs (license_id, action, details)
    VALUES (_license_id, 'created', jsonb_build_object(
      'source', 'pix_purchase_manual_recovery',
      'order_id', _order_id,
      'created_by_reseller', _reseller
    ));
  END LOOP;
END $$;

-- === FILE: 20260519201318_9e390afa-fbab-43a7-9171-840c8b411931.sql ===
UPDATE public.lvb_credit_orders SET status='cancelado', updated_at=now() WHERE id='0c9e8b35-4e26-42b5-8c87-09aaaed8e619';

-- === FILE: 20260519202604_c67561a9-bab5-4a20-9f7e-e3e28e5f8ea6.sql ===

-- LicenÃ§as pagas SEM dispositivo conectado: resetar para "aguardando ativaÃ§Ã£o" (30 dias)
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

-- LicenÃ§as pagas COM dispositivo jÃ¡ conectado: fixar expiraÃ§Ã£o em primeira_ativaÃ§Ã£o + 30 dias
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


-- === FILE: 20260519215919_e6202865-b13e-4ed6-979b-f38d1a218100.sql ===
UPDATE public.licenses
SET
  duration_hours = 720,
  first_activated_at = NULL,
  expires_at = now() + interval '100 years'
WHERE email = 'estoque'
  AND COALESCE(is_wildcard, false) = false
  AND first_activated_at IS NULL
  AND (
    duration_hours IS NULL
    OR duration_hours <> 720
    OR expires_at < now() + interval '50 years'
  );

-- === FILE: 20260520195442_802af176-0638-4032-815f-2124097d36b7.sql ===
CREATE OR REPLACE FUNCTION public.prevent_license_expiry_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _is_manager boolean;
  _max_expires timestamptz;
  _base timestamptz;
BEGIN
  -- Admins e managers podem alterar livremente
  _is_admin := has_role(auth.uid(), 'admin'::app_role);
  _is_manager := has_role(auth.uid(), 'manager'::app_role);
  IF _is_admin OR _is_manager THEN
    RETURN NEW;
  END IF;

  -- Service role (auth.uid IS NULL) tambÃ©m pode
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloqueia wildcard para nÃ£o-admins
  IF TG_OP = 'INSERT' AND COALESCE(NEW.is_wildcard, false) THEN
    RAISE EXCEPTION 'Revendedores nÃ£o podem criar licenÃ§as wildcard';
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.is_wildcard, false) AND NOT COALESCE(OLD.is_wildcard, false) THEN
    RAISE EXCEPTION 'Revendedores nÃ£o podem transformar licenÃ§as em wildcard';
  END IF;

  -- Calcula validade mÃ¡xima permitida = base + duration_hours + margem 1 dia
  _base := COALESCE(NEW.first_activated_at, NEW.created_at, now());
  _max_expires := _base + ((COALESCE(NEW.duration_hours, 720))::text || ' hours')::interval + interval '1 day';

  IF TG_OP = 'UPDATE' THEN
    -- Bloqueia aumento de expires_at acima do permitido
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at AND NEW.expires_at > _max_expires THEN
      RAISE EXCEPTION 'AlteraÃ§Ã£o de validade nÃ£o permitida (max: %)', _max_expires;
    END IF;
    -- Bloqueia mudanÃ§a de duration_hours acima de 35 dias
    IF NEW.duration_hours IS DISTINCT FROM OLD.duration_hours AND NEW.duration_hours > 840 THEN
      RAISE EXCEPTION 'DuraÃ§Ã£o invÃ¡lida';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.expires_at > _max_expires THEN
      RAISE EXCEPTION 'Validade inicial invÃ¡lida (max: %)', _max_expires;
    END IF;
    IF COALESCE(NEW.duration_hours, 720) > 840 THEN
      RAISE EXCEPTION 'DuraÃ§Ã£o inicial invÃ¡lida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_license_expiry_tampering ON public.licenses;
CREATE TRIGGER trg_prevent_license_expiry_tampering
BEFORE INSERT OR UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_license_expiry_tampering();

-- === FILE: 20260521160330_f0c5ed48-8797-4ec7-a788-6a50c0ee2946.sql ===
CREATE OR REPLACE FUNCTION public.prevent_license_expiry_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_expires timestamptz;
  _base timestamptz;
BEGIN
  IF auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'manager'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_wildcard, false) AND NOT COALESCE(OLD.is_wildcard, false) THEN
    RAISE EXCEPTION 'OperaÃ§Ã£o nÃ£o permitida';
  END IF;

  _base := COALESCE(OLD.first_activated_at, OLD.created_at, NEW.created_at, now());
  _max_expires := _base + ((COALESCE(NEW.duration_hours, OLD.duration_hours, 720))::text || ' hours')::interval + interval '2 days';

  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at
     AND NEW.expires_at > OLD.expires_at
     AND NEW.expires_at > _max_expires THEN
    RAISE EXCEPTION 'AlteraÃ§Ã£o de validade nÃ£o permitida (max: %)', _max_expires;
  END IF;

  RETURN NEW;
END;
$$;

-- === FILE: 20260526021339_c5301a6f-3a93-4a2c-a85f-01b332c59102.sql ===
ALTER TABLE public.credit_orders ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'standard';

-- === FILE: 20260526222148_5655a233-d589-4932-adae-d8b07f43afdc.sql ===
UPDATE public.licenses SET is_wildcard = true, duration_hours = 876000, expires_at = now() + interval '100 years', status = 'active', revoked_at = NULL, max_messages = NULL WHERE license_key = 'W802J-AXPGM-J53K7-093T4';

-- === FILE: 20260527005918_d7242763-fd1b-4a08-98da-b5461c118983.sql ===
UPDATE public.licenses
SET is_wildcard = true,
    duration_hours = 876000,
    expires_at = now() + interval '100 years',
    status = 'active',
    revoked_at = NULL,
    max_messages = NULL
WHERE license_key = 'VKT6F-R6TNU-8DVRL-9M6NL';

-- === FILE: 20260527024122_28b8a3e1-86ad-4790-b121-90ef862860e7.sql ===
INSERT INTO public.reseller_profiles (user_id, name, status)
SELECT u.id, COALESCE(split_part(u.email, '@', 1), 'Revendedor'), 'pending'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.reseller_profiles rp WHERE rp.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
  AND u.created_at > now() - interval '30 days'
ON CONFLICT (user_id) DO NOTHING;

-- === FILE: 20260527025936_8817bbdf-dd2d-4115-8b73-0623f01f152b.sql ===
INSERT INTO public.reseller_profiles (user_id, name, status)
SELECT u.id, split_part(u.email, '@', 1), 'pending'
FROM auth.users u
LEFT JOIN public.reseller_profiles rp ON rp.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE rp.id IS NULL
  AND ur.id IS NULL
  AND u.created_at > now() - interval '30 days'
  AND u.email IS NOT NULL;

-- === FILE: 20260527140000_revoke_anon_grants.sql ===
-- Defense in depth: remove all privileges from the anon role on sensitive tables.
-- All access to these tables flows through edge functions (service_role) or
-- authenticated users (RLS-protected). The anon role should not be able to
-- enumerate or touch any of them.

REVOKE ALL ON public.sessions FROM anon;
REVOKE ALL ON public.devices FROM anon;
REVOKE ALL ON public.licenses FROM anon;
REVOKE ALL ON public.license_logs FROM anon;
REVOKE ALL ON public.license_ip_tracking FROM anon;
REVOKE ALL ON public.license_project_tracking FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.reseller_profiles FROM anon;
REVOKE ALL ON public.reseller_credits FROM anon;
REVOKE ALL ON public.credit_orders FROM anon;
REVOKE ALL ON public.credits_customers FROM anon;
REVOKE ALL ON public.lvb_credit_orders FROM anon;
REVOKE ALL ON public.token_pool FROM anon;
REVOKE ALL ON public.token_refresh_logs FROM anon;
REVOKE ALL ON public.token_metrics FROM anon;
REVOKE ALL ON public.security_audit_logs FROM anon;
REVOKE ALL ON public.wildcard_usage FROM anon;
REVOKE ALL ON public.test_license_ips FROM anon;
REVOKE ALL ON public.telegram_bot_states FROM anon;
REVOKE ALL ON public.system_config FROM anon;
REVOKE ALL ON public.templates FROM anon;
REVOKE ALL ON public.apollo_hoopay_config FROM anon;
REVOKE ALL ON public.apollo_syncpay_config FROM anon;

-- Also remove INSERT/UPDATE/DELETE from authenticated on tables where no policy
-- ever allows authenticated writes directly (writes go through edge functions
-- using the service_role). RLS already blocks these, but stripping the grant
-- means the scanner won't even see the table as writable.
REVOKE INSERT, UPDATE, DELETE ON public.token_pool FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.token_refresh_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.token_metrics FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.security_audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.test_license_ips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.telegram_bot_states FROM authenticated;
REVOKE ALL ON public.telegram_bot_states FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.license_ip_tracking FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.license_project_tracking FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wildcard_usage FROM authenticated;


-- === FILE: 20260527220157_44504b0d-4fc5-41fa-9cea-fb9c9dbcb1bb.sql ===
ALTER TABLE public.lvb_credit_orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lvb_credit_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lvb_credit_orders;
  END IF;
END $$;

-- === FILE: 20260601003405_purge_stale_test_licenses.sql ===
-- 1) Purge stale unused test licenses immediately
WITH stale AS (
  SELECT id FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours'
)
DELETE FROM public.license_logs WHERE license_id IN (SELECT id FROM stale);

DELETE FROM public.sessions WHERE license_id IN (
  SELECT id FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours'
);

DELETE FROM public.devices WHERE license_id IN (
  SELECT id FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours'
);

DELETE FROM public.licenses
WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
  AND first_activated_at IS NULL
  AND created_at < now() - interval '24 hours';

-- 2) Extend update_expired_licenses to also purge unused test keys older than 24h
CREATE OR REPLACE FUNCTION public.update_expired_licenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark active licenses as expired
  UPDATE public.licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();

  -- Auto-delete expired test licenses
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses WHERE status = 'expired' AND (
      license_key LIKE 'TESTE-%' OR
      max_messages IS NOT NULL OR 
      (duration_hours IS NOT NULL AND duration_hours <= 0.17)
    )
  );
  DELETE FROM public.licenses WHERE status = 'expired' AND (
    license_key LIKE 'TESTE-%' OR
    max_messages IS NOT NULL OR 
    (duration_hours IS NOT NULL AND duration_hours <= 0.17)
  );

  -- Auto-delete UNACTIVATED test keys older than 24h (anti-stockpile)
  DELETE FROM public.license_logs WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.sessions WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.devices WHERE license_id IN (
    SELECT id FROM public.licenses
    WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
      AND first_activated_at IS NULL
      AND created_at < now() - interval '24 hours'
  );
  DELETE FROM public.licenses
  WHERE (license_key LIKE 'TESTE-%' OR (duration_hours IS NOT NULL AND duration_hours <= 0.17))
    AND first_activated_at IS NULL
    AND created_at < now() - interval '24 hours';
END;
$function$;


-- === FILE: 20260602042529_93c7219f-cc40-4ad5-925d-07159b8c76bb.sql ===
UPDATE public.licenses
SET created_by = '45aef207-f728-470d-ab26-52d19607fbf9',
    email = 'pacoca14005512@gmail.co'
WHERE license_key = 'VG9PC-8KUT8-WIY44-9MN86';

-- === FILE: 20260603161645_f120807a-0405-4716-a138-529a08ded589.sql ===
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on licenses" ON public.licenses;
DROP POLICY IF EXISTS "Allow public update on licenses" ON public.licenses;

CREATE POLICY "Allow public select on licenses"
  ON public.licenses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public update on licenses"
  ON public.licenses
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.licenses TO anon;
GRANT SELECT, UPDATE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;

-- === FILE: 20260605040128_d237538a-4ba8-4bea-bd88-c4d3d6e39cff.sql ===
-- Fix critical security findings: remove public access to licenses table
-- and add missing DELETE policy for Apollo users on apollo_hoopay_config

-- 1. Remove overly permissive public policies on licenses table
--    These allowed any unauthenticated user to read all 204+ license records
--    and UPDATE any row freely (including revoking/extending licenses).
--    License validation is done via service-role Edge Functions.
DROP POLICY IF EXISTS "Allow public select on licenses" ON public.licenses;
DROP POLICY IF EXISTS "Allow public update on licenses" ON public.licenses;

-- 2. Add DELETE policy so Apollo users can clean up their own Hoopay credentials
CREATE POLICY "Apollo can delete own hoopay config"
  ON public.apollo_hoopay_config
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid())
    AND has_role(auth.uid(), 'apollo'::app_role)
  );

-- === FILE: 20260605040226_52e9465b-baef-4ce0-bded-af83f5083972.sql ===
-- Fix: lvb_credit_orders is published to Supabase Realtime but no application code
-- subscribes to this table. Removing it from the publication eliminates the risk
-- that any authenticated user could receive real-time row-change events for
-- all credit orders (including other resellers' pix data, amounts, etc.).

-- Remove from realtime publication to prevent unauthorized broadcast exposure.
ALTER PUBLICATION supabase_realtime DROP TABLE public.lvb_credit_orders;

-- === FILE: 20260606001730_c19e87d2-d132-4e6f-b556-0759be2c668b.sql ===
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS hwid TEXT DEFAULT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS hwid_set_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_licenses_hwid ON public.licenses(hwid) WHERE hwid IS NOT NULL;

-- === FILE: 20260606040557_ext_ui_responsive.sql ===
-- Add responsive CSS and image thumbnail constraints to extension UI
DO $$
DECLARE
  extra text := E'\n/* === Responsive fixes & image thumbnails === */\n.banner { max-height: 110px; }\n.banner img { max-height: 110px; object-fit: cover; }\n.bubble img, .bubble video { max-width: 180px; max-height: 180px; border-radius: 10px; display: block; margin: 4px 0; object-fit: cover; cursor: zoom-in; }\n.file-chip img { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; }\n.file-preview img { max-width: 48px; max-height: 48px; object-fit: cover; border-radius: 6px; }\n@media (max-width: 380px) {\n  .header { padding: 8px 10px; }\n  .header-logo { height: 14px; }\n  .license-badge { font-size: 9px; padding: 3px 8px; }\n  .publish-btn { padding: 4px 10px; font-size: 10px; }\n  .icon-btn { width: 26px; height: 26px; }\n  .banner, .banner img { max-height: 80px; }\n  .bubble { font-size: 12.5px; padding: 9px 13px; }\n  .empty-logo { width: 56px; height: 56px; }\n  .empty-state h3 { font-size: 14px; }\n  .empty-state p { font-size: 12px; }\n  .empty-suggestions button { font-size: 11px; padding: 5px 11px; }\n  .input-area { padding: 8px 10px 12px; }\n  .input-wrapper textarea { font-size: 13px; min-height: 44px; }\n}\n@media (max-height: 600px) {\n  .banner, .banner img { max-height: 60px; }\n  .empty-logo { width: 48px; height: 48px; margin-bottom: 8px; }\n  .input-wrapper textarea { min-height: 40px; }\n}\n';
BEGIN
  UPDATE public.system_config
  SET value = replace(value, '</style>', extra || '</style>'),
      updated_at = now()
  WHERE key = 'extension_front_html'
    AND position('=== Responsive fixes & image thumbnails ===' in value) = 0;
END $$;


-- === FILE: 20260606041025_357ed1e5-7830-4c34-8511-8f470915a3c5.sql ===
DO $$
DECLARE
  extra text := E'\n/* === Responsive fixes & image thumbnails === */\n.banner { max-height: 90px; }\n.banner img { max-height: 90px; width: 100%; object-fit: cover; object-position: center; display: block; }\n.bubble img, .bubble video, .message-wrapper img, .message-wrapper video { max-width: 160px !important; max-height: 160px !important; width: auto !important; height: auto !important; border-radius: 10px; display: block; margin: 4px 0; object-fit: cover; cursor: zoom-in; }\n.file-chip img { width: 32px !important; height: 32px !important; object-fit: cover; border-radius: 6px; }\n.file-preview img { max-width: 44px !important; max-height: 44px !important; object-fit: cover; border-radius: 6px; }\n@media (max-width: 380px) {\n  .header { padding: 8px 10px; }\n  .header-logo { height: 14px; }\n  .license-badge { font-size: 9px; padding: 3px 8px; }\n  .publish-btn { padding: 4px 10px; font-size: 10px; }\n  .icon-btn { width: 26px; height: 26px; }\n  .banner, .banner img { max-height: 70px; }\n  .bubble { font-size: 12.5px; padding: 9px 13px; }\n  .bubble img, .message-wrapper img { max-width: 130px !important; max-height: 130px !important; }\n  .empty-logo { width: 56px; height: 56px; }\n  .empty-state h3 { font-size: 14px; }\n  .empty-state p { font-size: 12px; }\n  .empty-suggestions button { font-size: 11px; padding: 5px 11px; }\n}\n@media (max-height: 600px) {\n  .banner, .banner img { max-height: 55px; }\n  .empty-logo { width: 48px; height: 48px; margin-bottom: 8px; }\n}\n';
BEGIN
  UPDATE public.system_config
  SET value = replace(value, '</style>', extra || '</style>'),
      updated_at = now()
  WHERE key = 'extension_front_html'
    AND position('Responsive fixes & image thumbnails' in value) = 0;
END $$;

-- === FILE: 20260608171946_60ef5a48-addc-4a58-b66c-d236a221c406.sql ===
UPDATE public.licenses SET is_wildcard = true, duration_hours = 36500*24, expires_at = now() + interval '100 years', status = 'active' WHERE created_by = (SELECT id FROM auth.users WHERE email = 'es73896@gmail.com');

-- === FILE: 20260622160210_dc6120cc-3042-4d77-b57e-da6b6c145ea5.sql ===
ALTER TABLE public.credit_orders ADD COLUMN IF NOT EXISTS target_license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL;

-- === FILE: 20260622172503_97cba3a1-e310-48c4-aa49-bd97b9b9264e.sql ===
UPDATE public.licenses SET created_by = 'a1e4a352-2569-4a26-a7db-08f7d3eca01a' WHERE license_key IN ('JFHFI-9BCGL-UHQBL-QC9XZ','XLUKR-AX62Q-6UQVM-8ABB9');

-- === FILE: 20260624011618_0fe02d76-3667-44ef-aebe-306340027a78.sql ===

ALTER TABLE public.reseller_credits
  ADD COLUMN IF NOT EXISTS lifetime_credits_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_credits_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.use_reseller_lifetime_credit(_reseller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _available integer;
BEGIN
  SELECT lifetime_credits_total - lifetime_credits_used INTO _available
  FROM public.reseller_credits
  WHERE reseller_id = _reseller_id
  FOR UPDATE;

  IF _available IS NULL OR _available <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.reseller_credits
  SET lifetime_credits_used = lifetime_credits_used + 1, updated_at = now()
  WHERE reseller_id = _reseller_id;

  RETURN true;
END;
$$;


-- === FILE: 20260624150144_80833b7e-4325-490b-80b9-392dd6e5f958.sql ===
UPDATE public.licenses SET created_by = (SELECT id FROM auth.users WHERE email='fabricionedino2@gmail.com' LIMIT 1) WHERE license_key='Z2A6M-NT56P-X3AZ9-VHUHT';
INSERT INTO public.license_logs (license_id, action, details) SELECT id, 'reassigned_to_reseller', jsonb_build_object('to_email','fabricionedino2@gmail.com') FROM public.licenses WHERE license_key='Z2A6M-NT56P-X3AZ9-VHUHT';

-- === FILE: 20260625231001_6953ea52-e530-4c3d-800a-cb8d0b020f53.sql ===
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email='guilherme.amorimcrm@gmail.com' LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UsuÃ¡rio nÃ£o encontrado';
  END IF;
  UPDATE public.licenses SET created_by = _uid, email = 'guilherme.amorimcrm@gmail.com' WHERE license_key='NNCV0-Q039W-DFSOL-S1D8X';
END $$;

-- === FILE: 20260630220209_74000cec-3460-4552-90ae-8590820439a3.sql ===
DELETE FROM public.devices d
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY license_id, hwid ORDER BY last_seen_at DESC NULLS LAST, id) AS rn
  FROM public.devices
) x
WHERE d.id = x.id AND x.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS devices_license_hwid_uniq ON public.devices (license_id, hwid);

-- === FILE: 20260702193441_1215a7ac-c5ec-4c71-bed2-6bf8020c922e.sql ===
-- Perf: Ã­ndices faltantes usados pelo painel admin
CREATE INDEX IF NOT EXISTS idx_devices_activated_at ON public.devices (activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_license_id ON public.devices (license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON public.licenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_created_by ON public.licenses (created_by);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses (status);

-- RPC otimizada para admin/manager: uma query sÃ³, sem overhead de RLS por linha.
CREATE OR REPLACE FUNCTION public.admin_list_licenses()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(l_with_devices) ORDER BY (l_with_devices->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT to_jsonb(l) || jsonb_build_object(
      'devices', COALESCE(
        (SELECT jsonb_agg(to_jsonb(d)) FROM public.devices d WHERE d.license_id = l.id),
        '[]'::jsonb
      )
    ) AS l_with_devices
    FROM public.licenses l
  ) t;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_licenses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_licenses() TO authenticated;

-- === FILE: 20260702194100_7799df59-caae-4354-9f08-a9d4c0e1b131.sql ===
-- Perf: RPC agregada para listagem de revendedores no painel admin.
-- Retorna profiles + licenseCount + credits + paidKeys em uma Ãºnica chamada,
-- eliminando 4 round-trips paralelos.
CREATE OR REPLACE FUNCTION public.admin_list_resellers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH lic AS (
    SELECT created_by, count(*) FILTER (WHERE max_messages IS NULL) AS license_count
    FROM public.licenses
    WHERE created_by IS NOT NULL
    GROUP BY created_by
  ),
  cred AS (
    SELECT reseller_id, credits_total, credits_used
    FROM public.reseller_credits
  ),
  paid AS (
    SELECT reseller_id, SUM(quantity)::int AS paid_keys
    FROM public.credit_orders
    WHERE status = 'paid'
    GROUP BY reseller_id
  )
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      to_jsonb(rp) || jsonb_build_object(
        'licenseCount', COALESCE(lic.license_count, 0),
        'credits_total', COALESCE(cred.credits_total, 0),
        'credits_used', COALESCE(cred.credits_used, 0),
        'paidKeys', COALESCE(paid.paid_keys, 0)
      ) AS r
    FROM public.reseller_profiles rp
    LEFT JOIN lic  ON lic.created_by  = rp.user_id
    LEFT JOIN cred ON cred.reseller_id = rp.user_id
    LEFT JOIN paid ON paid.reseller_id = rp.user_id
  ) t;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_resellers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_resellers() TO authenticated;

-- Ãndice de apoio
CREATE INDEX IF NOT EXISTS idx_credit_orders_reseller_status ON public.credit_orders (reseller_id, status);

-- === FILE: 20260702195754_d1ab2e96-7e3e-488b-8625-b29962e55c85.sql ===
CREATE OR REPLACE FUNCTION public.admin_list_resellers()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH lic AS (
    SELECT created_by, count(*) FILTER (WHERE max_messages IS NULL) AS license_count
    FROM public.licenses
    WHERE created_by IS NOT NULL
    GROUP BY created_by
  ),
  cred AS (
    SELECT reseller_id, credits_total, credits_used, lifetime_credits_total, lifetime_credits_used
    FROM public.reseller_credits
  ),
  paid AS (
    SELECT reseller_id, SUM(quantity)::int AS paid_keys
    FROM public.credit_orders
    WHERE status = 'paid'
    GROUP BY reseller_id
  )
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      to_jsonb(rp) || jsonb_build_object(
        'licenseCount', COALESCE(lic.license_count, 0),
        'credits_total', COALESCE(cred.credits_total, 0),
        'credits_used', COALESCE(cred.credits_used, 0),
        'lifetime_credits_total', COALESCE(cred.lifetime_credits_total, 0),
        'lifetime_credits_used', COALESCE(cred.lifetime_credits_used, 0),
        'paidKeys', COALESCE(paid.paid_keys, 0)
      ) AS r
    FROM public.reseller_profiles rp
    LEFT JOIN lic  ON lic.created_by  = rp.user_id
    LEFT JOIN cred ON cred.reseller_id = rp.user_id
    LEFT JOIN paid ON paid.reseller_id = rp.user_id
  ) t;

  RETURN _result;
END;
$function$;

-- === FILE: 20260703061429_0bf5a105-cb8a-4580-94ec-2f84d0e98a86.sql ===
NOTIFY pgrst, 'reload schema';

-- === FILE: 20260703061547_7d8faeb2-866c-4b4b-bb80-379e1ae56b3e.sql ===

CREATE OR REPLACE FUNCTION public.admin_list_resellers()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH lic AS (
    SELECT created_by, count(*) FILTER (WHERE max_messages IS NULL) AS license_count
    FROM public.licenses
    WHERE created_by IS NOT NULL
    GROUP BY created_by
  ),
  cred AS (
    SELECT reseller_id, credits_total, credits_used, lifetime_credits_total, lifetime_credits_used
    FROM public.reseller_credits
  ),
  paid AS (
    SELECT reseller_id, SUM(quantity)::int AS paid_keys
    FROM public.credit_orders
    WHERE status = 'paid'
    GROUP BY reseller_id
  )
  SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      to_jsonb(rp) || jsonb_build_object(
        'licenseCount', COALESCE(lic.license_count, 0),
        'credits_total', COALESCE(cred.credits_total, 0),
        'credits_used', COALESCE(cred.credits_used, 0),
        'lifetime_credits_total', COALESCE(cred.lifetime_credits_total, 0),
        'lifetime_credits_used', COALESCE(cred.lifetime_credits_used, 0),
        'paidKeys', COALESCE(paid.paid_keys, 0)
      ) AS r
    FROM public.reseller_profiles rp
    LEFT JOIN lic  ON lic.created_by  = rp.user_id
    LEFT JOIN cred ON cred.reseller_id = rp.user_id
    LEFT JOIN paid ON paid.reseller_id = rp.user_id
  ) t;

  RETURN _result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_licenses()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(l_with_devices ORDER BY (l_with_devices->>'created_at') DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT to_jsonb(l) || jsonb_build_object(
      'devices', COALESCE(
        (SELECT jsonb_agg(to_jsonb(d)) FROM public.devices d WHERE d.license_id = l.id),
        '[]'::jsonb
      )
    ) AS l_with_devices
    FROM public.licenses l
  ) t;

  RETURN _result;
END;
$function$;

NOTIFY pgrst, 'reload schema';


-- === FILE: 20260703162933_c88d3a3b-ff85-4ef0-8630-8a4bcc2f022a.sql ===
CREATE OR REPLACE FUNCTION public.normalize_test_license_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.license_key LIKE 'TESTE-%' AND char_length(NEW.license_key) > 23 THEN
    NEW.license_key := substring(NEW.license_key from 1 for 23);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_test_license_key_before_insert_update ON public.licenses;

CREATE TRIGGER normalize_test_license_key_before_insert_update
BEFORE INSERT OR UPDATE OF license_key ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.normalize_test_license_key();

UPDATE public.licenses
SET license_key = substring(license_key from 1 for 23)
WHERE license_key LIKE 'TESTE-%'
  AND char_length(license_key) > 23;

-- === FILE: 20260716051200_3af06a77-f8ae-4f06-b6f7-7568604587bf.sql ===
UPDATE public.reseller_profiles
SET status = 'approved', approved_at = now(), updated_at = now()
WHERE user_id = '1ee95cb5-3c28-4808-8d65-19ee805bd6aa';

INSERT INTO public.user_roles (user_id, role)
VALUES ('1ee95cb5-3c28-4808-8d65-19ee805bd6aa', 'reseller')
ON CONFLICT (user_id, role) DO NOTHING;

-- === FILE: 20260725194305_94d74160-712e-4c50-8de4-272fb20ba08b.sql ===

-- ============================================================
-- 1. LEVELS TABLE
-- ============================================================
CREATE TABLE public.community_discount_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT 'ðŸ…',
  sales_required integer NOT NULL,
  discount_percentage numeric(5,2) NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_discount_levels TO authenticated;
GRANT ALL ON public.community_discount_levels TO service_role;

ALTER TABLE public.community_discount_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read levels"
  ON public.community_discount_levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage levels"
  ON public.community_discount_levels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_community_discount_levels_updated_at
  BEFORE UPDATE ON public.community_discount_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.community_discount_levels (name, emoji, sales_required, discount_percentage, order_index) VALUES
  ('Bronze',   'ðŸ¥‰', 10, 3,  1),
  ('Prata',    'ðŸ¥ˆ', 20, 5,  2),
  ('Ouro',     'ðŸ¥‡', 35, 8,  3),
  ('Platina',  'ðŸ’Ž', 50, 12, 4),
  ('Diamante', 'ðŸ’ ', 75, 15, 5);

-- ============================================================
-- 2. CONFIG TABLE (singleton)
-- ============================================================
CREATE TABLE public.community_discount_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_discount_config TO authenticated;
GRANT ALL ON public.community_discount_config TO service_role;

ALTER TABLE public.community_discount_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read config"
  ON public.community_discount_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage config"
  ON public.community_discount_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_community_discount_config_updated_at
  BEFORE UPDATE ON public.community_discount_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.community_discount_config (is_active) VALUES (true);

-- ============================================================
-- 3. RESELLER PROGRESS TABLE
-- ============================================================
CREATE TABLE public.reseller_community_progress (
  reseller_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_sales integer NOT NULL DEFAULT 0,
  current_level_id uuid REFERENCES public.community_discount_levels(id) ON DELETE SET NULL,
  current_discount numeric(5,2) NOT NULL DEFAULT 0,
  next_level_id uuid REFERENCES public.community_discount_levels(id) ON DELETE SET NULL,
  sales_to_next integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reseller_community_progress TO authenticated;
GRANT ALL ON public.reseller_community_progress TO service_role;

ALTER TABLE public.reseller_community_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own progress"
  ON public.reseller_community_progress FOR SELECT
  TO authenticated USING (reseller_id = auth.uid());

CREATE POLICY "Admins and managers view all progress"
  ON public.reseller_community_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers manage progress"
  ON public.reseller_community_progress FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_reseller_community_progress_updated_at
  BEFORE UPDATE ON public.reseller_community_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. RECALC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_reseller_progress(_reseller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_sales integer;
  _current_level RECORD;
  _next_level RECORD;
BEGIN
  IF _reseller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantity), 0)::int INTO _total_sales
  FROM public.credit_orders
  WHERE reseller_id = _reseller_id AND status = 'paid';

  -- Highest reached level (sales_required <= total)
  SELECT * INTO _current_level
  FROM public.community_discount_levels
  WHERE sales_required <= _total_sales
  ORDER BY order_index DESC
  LIMIT 1;

  -- Next locked level
  SELECT * INTO _next_level
  FROM public.community_discount_levels
  WHERE sales_required > _total_sales
  ORDER BY order_index ASC
  LIMIT 1;

  INSERT INTO public.reseller_community_progress (
    reseller_id, current_sales, current_level_id, current_discount, next_level_id, sales_to_next
  ) VALUES (
    _reseller_id,
    _total_sales,
    _current_level.id,
    COALESCE(_current_level.discount_percentage, 0),
    _next_level.id,
    CASE WHEN _next_level.id IS NOT NULL THEN _next_level.sales_required - _total_sales ELSE NULL END
  )
  ON CONFLICT (reseller_id) DO UPDATE SET
    current_sales = EXCLUDED.current_sales,
    current_level_id = EXCLUDED.current_level_id,
    current_discount = EXCLUDED.current_discount,
    next_level_id = EXCLUDED.next_level_id,
    sales_to_next = EXCLUDED.sales_to_next,
    updated_at = now();
END;
$$;

-- ============================================================
-- 5. TRIGGER ON credit_orders paid transitions
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_credit_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.recalc_reseller_progress(NEW.reseller_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER credit_order_paid_recalc_progress
  AFTER INSERT OR UPDATE ON public.credit_orders
  FOR EACH ROW EXECUTE FUNCTION public.on_credit_order_paid();

-- ============================================================
-- 6. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reseller_community_progress;
ALTER TABLE public.reseller_community_progress REPLICA IDENTITY FULL;

-- ============================================================
-- 7. BACKFILL
-- ============================================================
DO $$
DECLARE _r uuid;
BEGIN
  FOR _r IN SELECT DISTINCT reseller_id FROM public.credit_orders WHERE status = 'paid' AND reseller_id IS NOT NULL
  LOOP
    PERFORM public.recalc_reseller_progress(_r);
  END LOOP;
END $$;

-- ============================================================
-- 8. ADMIN RPC: reset all
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_community_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.reseller_community_progress
  SET current_sales = 0, current_level_id = NULL, current_discount = 0,
      next_level_id = (SELECT id FROM public.community_discount_levels ORDER BY order_index ASC LIMIT 1),
      sales_to_next = (SELECT sales_required FROM public.community_discount_levels ORDER BY order_index ASC LIMIT 1),
      updated_at = now();
END;
$$;


-- === FILE: 20260725194321_b3ff4961-a193-4b9c-abe0-c8e168be477a.sql ===

REVOKE EXECUTE ON FUNCTION public.recalc_reseller_progress(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.on_credit_order_paid() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_community_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_community_progress() TO authenticated;


-- === FILE: 20260730152735_ff59701a-18f8-47a2-831f-7c8e539a4882.sql ===
UPDATE public.licenses SET is_wildcard = true, status = 'active', expires_at = now() + interval '100 years' WHERE license_key = 'MV0AC-UM2RY-G33QU-U6HQ6';
INSERT INTO public.license_logs (license_id, action, details) SELECT id, 'converted_to_lifetime', jsonb_build_object('license_key', license_key) FROM public.licenses WHERE license_key = 'MV0AC-UM2RY-G33QU-U6HQ6';

-- === FILE: 20260730162919_bf53b1cf-4ed6-4e3d-b698-34ae12c39369.sql ===
WITH bad AS (
  SELECT l.id, o.product_type
  FROM credit_orders o
  JOIN licenses l ON l.notes LIKE '%Pedido PIX #' || substr(o.id::text,1,8) || '%'
  WHERE o.status = 'paid'
    AND o.product_type IN ('gemini_pro','manus_credits','seedance_account','combo','combo_account','capcut_pro')
    AND l.status <> 'revoked'
), upd AS (
  UPDATE licenses l
  SET status = 'revoked',
      revoked_at = now(),
      notes = COALESCE(l.notes,'') || E'\n[Revogada: chave gerada indevidamente em compra de produto de conta/crÃ©ditos]'
  FROM bad
  WHERE l.id = bad.id
  RETURNING l.id, bad.product_type
)
INSERT INTO license_logs (license_id, action, details)
SELECT id, 'revoked', jsonb_build_object('reason','indevida_produto_nao_chave','product_type',product_type)
FROM upd;

-- === FILE: 20260731160600_2ea98b3c-578b-422e-a7c3-ba592102a148.sql ===
DO $$
DECLARE
  v_owner uuid := 'de73c8e4-1e7f-4581-87b5-f13975d99b1a';
  v_key text;
  v_id uuid;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i int;
BEGIN
  LOOP
    v_key := '';
    FOR i IN 1..20 LOOP
      v_key := v_key || substr(chars, 1 + floor(random()*length(chars))::int, 1);
      IF i IN (5,10,15) THEN v_key := v_key || '-'; END IF;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.licenses WHERE license_key = v_key);
  END LOOP;

  INSERT INTO public.licenses (license_key, email, status, expires_at, notes, price, duration_hours, created_by)
  VALUES (v_key, 'estoque', 'active', now() + interval '6 days', 'Chave 6 dias criada manualmente pelo admin para thiagorp2550@gmail.com', 0, 144, v_owner)
  RETURNING id INTO v_id;

  INSERT INTO public.license_logs (license_id, action, details)
  VALUES (v_id, 'created', jsonb_build_object('source','admin_manual','duration_days',6,'reseller_email','thiagorp2550@gmail.com','license_key',v_key));

  RAISE NOTICE 'created %', v_key;
END $$;

