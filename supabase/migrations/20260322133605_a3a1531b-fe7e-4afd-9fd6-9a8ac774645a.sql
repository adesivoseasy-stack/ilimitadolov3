CREATE POLICY "Resellers can delete own devices"
ON public.devices
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = devices.license_id
      AND licenses.created_by = auth.uid()
  )
);

CREATE POLICY "Resellers can delete own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = sessions.license_id
      AND licenses.created_by = auth.uid()
  )
);