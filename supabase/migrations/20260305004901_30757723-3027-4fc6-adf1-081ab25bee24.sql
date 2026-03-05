CREATE POLICY "Editors can delete quiz questions"
ON public.quiz_questions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role));