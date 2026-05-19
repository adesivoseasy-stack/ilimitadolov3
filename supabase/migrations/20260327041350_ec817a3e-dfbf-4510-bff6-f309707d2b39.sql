-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Allow service role to insert
CREATE POLICY "Service role insert for message attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-attachments');