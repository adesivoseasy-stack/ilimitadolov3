-- Add columns to track intended duration and first activation
ALTER TABLE public.licenses 
ADD COLUMN duration_hours numeric NULL,
ADD COLUMN first_activated_at timestamp with time zone NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.licenses.duration_hours IS 'Intended duration in hours. If set, expires_at is calculated from first_activated_at';
COMMENT ON COLUMN public.licenses.first_activated_at IS 'When the license was first activated/used. NULL means not yet activated';