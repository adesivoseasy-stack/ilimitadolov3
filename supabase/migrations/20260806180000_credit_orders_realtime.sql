-- Habilita Realtime na tabela credit_orders para polling em tempo real
ALTER TABLE public.credit_orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'credit_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_orders;
  END IF;
END $$;
