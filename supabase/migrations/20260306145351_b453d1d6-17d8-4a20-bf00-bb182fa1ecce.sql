ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS max_messages integer DEFAULT NULL;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS messages_used integer NOT NULL DEFAULT 0;