
-- 1. message-attachments: explicit DELETE/UPDATE policies (service_role only)
CREATE POLICY "Service role can delete message-attachments"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'message-attachments');

CREATE POLICY "Service role can update message-attachments"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'message-attachments')
WITH CHECK (bucket_id = 'message-attachments');

-- 2. user_roles: RESTRICTIVE policy blocking self role assignment
CREATE POLICY "Block self role assignment"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id <> auth.uid());
