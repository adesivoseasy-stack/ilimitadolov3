
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
