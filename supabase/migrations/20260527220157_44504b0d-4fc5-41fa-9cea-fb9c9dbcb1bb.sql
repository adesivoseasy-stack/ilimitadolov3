ALTER TABLE public.lvb_credit_orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lvb_credit_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lvb_credit_orders;
  END IF;
END $$;