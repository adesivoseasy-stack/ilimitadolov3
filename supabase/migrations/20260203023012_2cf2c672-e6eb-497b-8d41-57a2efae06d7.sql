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