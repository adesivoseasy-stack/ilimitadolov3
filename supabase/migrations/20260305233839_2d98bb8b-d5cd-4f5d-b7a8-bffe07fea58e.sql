-- Clear all existing device bindings so users can re-activate with the new HWID format (User-Agent only, no IP)
DELETE FROM public.devices;