
-- Allow editors to delete courses
CREATE POLICY "Editors can delete courses"
ON public.courses
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role));

-- Allow editors to delete modules
CREATE POLICY "Editors can delete modules"
ON public.modules
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role));

-- Allow editors to delete lessons
CREATE POLICY "Editors can delete lessons"
ON public.lessons
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role));
