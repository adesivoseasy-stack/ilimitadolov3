
ALTER TABLE public.apollo_hoopay_config 
  RENAME COLUMN hoopay_username TO client_id;
ALTER TABLE public.apollo_hoopay_config 
  RENAME COLUMN hoopay_password TO client_secret;
