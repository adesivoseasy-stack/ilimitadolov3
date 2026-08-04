-- clean_migration_part1.sql
-- Contains ENUMs, TABLES, and INDEXES

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'reseller', 'manager', 'apollo', 'credits_customer');
CREATE TYPE public.license_status AS ENUM ('active', 'expired', 'revoked');

-- TABLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  status license_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  duration_hours NUMERIC NULL,
  first_activated_at TIMESTAMP WITH TIME ZONE NULL,
  is_wildcard BOOLEAN DEFAULT false,
  created_by UUID,
  max_messages INTEGER DEFAULT NULL,
  messages_used INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  hwid TEXT DEFAULT NULL,
  hwid_set_at TIMESTAMPTZ DEFAULT NULL
);
COMMENT ON COLUMN public.licenses.duration_hours IS 'Intended duration in hours. If set, expires_at is calculated from first_activated_at';
COMMENT ON COLUMN public.licenses.first_activated_at IS 'When the license was first activated/used. NULL means not yet activated';

CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
  hwid TEXT NOT NULL,
  device_name TEXT,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (license_id, hwid)
);

CREATE TABLE IF NOT EXISTS public.license_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  hwid TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_bot_states (
  user_id BIGINT PRIMARY KEY,
  action TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  video_url TEXT
);

CREATE TABLE IF NOT EXISTS public.wildcard_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 1,
  first_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(license_id, ip_address)
);

CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plan_type TEXT NOT NULL DEFAULT '197',
  document TEXT,
  custom_key_price NUMERIC DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id),
  deadline_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.reseller_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL,
  credits_total INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lifetime_credits_total INTEGER NOT NULL DEFAULT 0,
  lifetime_credits_used INTEGER NOT NULL DEFAULT 0,
  UNIQUE (reseller_id)
);

CREATE TABLE IF NOT EXISTS public.credit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pagseguro_order_id TEXT,
  qr_code_text TEXT,
  qr_code_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  product_type TEXT NOT NULL DEFAULT 'standard',
  target_license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lvb_credit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL,
  external_order_id TEXT,
  creditos INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aguardando',
  link_cliente TEXT,
  email_bot TEXT,
  workspace_id TEXT,
  workspace_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_order_id TEXT,
  pix_qr_code TEXT,
  pix_code_text TEXT,
  source TEXT NOT NULL DEFAULT 'reseller_panel'
);

CREATE TABLE IF NOT EXISTS public.token_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_license_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.token_pool(id) ON DELETE CASCADE,
  account_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  old_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.token_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  function_name TEXT DEFAULT 'unknown',
  license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.apollo_hoopay_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  client_id TEXT NOT NULL DEFAULT '',
  client_secret TEXT NOT NULL DEFAULT '',
  organization_uuid TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  blocked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.apollo_syncpay_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL DEFAULT '',
  client_secret TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.credits_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.license_ip_tracking (
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

CREATE TABLE IF NOT EXISTS public.license_project_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (license_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.community_discount_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏅',
  sales_required INTEGER NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_discount_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_community_progress (
  reseller_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_sales INTEGER NOT NULL DEFAULT 0,
  current_level_id UUID REFERENCES public.community_discount_levels(id) ON DELETE SET NULL,
  current_discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  next_level_id UUID REFERENCES public.community_discount_levels(id) ON DELETE SET NULL,
  sales_to_next INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_wildcard_usage_license_ip ON public.wildcard_usage(license_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_created ON public.token_refresh_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_status ON public.token_refresh_logs(status);
CREATE INDEX IF NOT EXISTS idx_token_metrics_created_at ON public.token_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_metrics_provider ON public.token_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_lvb_credit_orders_source ON public.lvb_credit_orders(source);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_license_ip_tracking_license ON public.license_ip_tracking(license_id);
CREATE INDEX IF NOT EXISTS idx_license_ip_tracking_last_seen ON public.license_ip_tracking(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_lpt_license_lastseen ON public.license_project_tracking(license_id, last_seen_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS devices_license_hwid_uniq ON public.devices (license_id, hwid);
CREATE INDEX IF NOT EXISTS idx_devices_activated_at ON public.devices (activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_license_id ON public.devices (license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON public.licenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_created_by ON public.licenses (created_by);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses (status);
CREATE INDEX IF NOT EXISTS idx_licenses_hwid ON public.licenses(hwid) WHERE hwid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_orders_reseller_status ON public.credit_orders (reseller_id, status);

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
