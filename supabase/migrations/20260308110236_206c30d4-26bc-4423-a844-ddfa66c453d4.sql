CREATE POLICY "Professors can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'professor'::app_role));