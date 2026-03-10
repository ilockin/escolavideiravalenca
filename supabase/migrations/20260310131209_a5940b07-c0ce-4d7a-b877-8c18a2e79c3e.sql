
-- Add description and external_links to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS external_links jsonb DEFAULT '[]'::jsonb;

-- Create quiz_attempts table to track individual student answers
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint so we keep latest attempt per user/lesson
CREATE INDEX idx_quiz_attempts_user_lesson ON public.quiz_attempts(user_id, lesson_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Students can insert/read own attempts
CREATE POLICY "Users can manage own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Staff can read all attempts
CREATE POLICY "Staff can read all quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'professor'::app_role));
