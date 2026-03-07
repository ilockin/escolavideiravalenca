CREATE POLICY "Staff can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'professor'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'professor'::app_role));