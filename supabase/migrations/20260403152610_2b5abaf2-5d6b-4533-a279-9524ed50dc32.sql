ALTER TABLE public.lvb_credit_orders 
ADD COLUMN IF NOT EXISTS payment_order_id text,
ADD COLUMN IF NOT EXISTS pix_qr_code text,
ADD COLUMN IF NOT EXISTS pix_code_text text;