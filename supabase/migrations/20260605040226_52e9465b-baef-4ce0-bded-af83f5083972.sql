-- Fix: lvb_credit_orders is published to Supabase Realtime but no application code
-- subscribes to this table. Removing it from the publication eliminates the risk
-- that any authenticated user could receive real-time row-change events for
-- all credit orders (including other resellers' pix data, amounts, etc.).

-- Remove from realtime publication to prevent unauthorized broadcast exposure.
ALTER PUBLICATION supabase_realtime DROP TABLE public.lvb_credit_orders;