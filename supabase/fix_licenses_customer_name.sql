-- Add missing customer_name column to licenses table
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS customer_name TEXT;
