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