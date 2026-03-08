CREATE POLICY "Professors can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'professor'::app_role));