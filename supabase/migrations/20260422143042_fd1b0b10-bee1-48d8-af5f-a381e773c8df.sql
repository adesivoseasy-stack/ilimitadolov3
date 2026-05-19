
UPDATE public.reseller_profiles
SET 
  status = 'approved',
  approved_at = now()
WHERE status = 'pending';
