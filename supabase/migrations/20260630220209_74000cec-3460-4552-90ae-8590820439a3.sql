DELETE FROM public.devices d
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY license_id, hwid ORDER BY last_seen_at DESC NULLS LAST, id) AS rn
  FROM public.devices
) x
WHERE d.id = x.id AND x.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS devices_license_hwid_uniq ON public.devices (license_id, hwid);