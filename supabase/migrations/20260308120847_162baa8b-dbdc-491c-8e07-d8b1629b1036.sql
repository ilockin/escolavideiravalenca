
-- Add close_date column to modules
ALTER TABLE public.modules ADD COLUMN close_date timestamp with time zone DEFAULT NULL;

-- Allow professors to manage modules (insert, update, delete)
CREATE POLICY "Professors can manage modules"
ON public.modules
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'professor'::app_role))
WITH CHECK (has_role(auth.uid(), 'professor'::app_role));

-- Allow professors to manage lessons
CREATE POLICY "Professors can manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'professor'::app_role))
WITH CHECK (has_role(auth.uid(), 'professor'::app_role));

-- Allow professors to manage quiz questions
CREATE POLICY "Professors can manage quiz questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'professor'::app_role))
WITH CHECK (has_role(auth.uid(), 'professor'::app_role));
