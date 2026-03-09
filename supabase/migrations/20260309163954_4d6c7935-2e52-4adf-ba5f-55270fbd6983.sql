
-- Create lesson_analytics table
CREATE TABLE public.lesson_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add attendance fields to turmas
ALTER TABLE public.turmas
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN min_attendance_percent NUMERIC NOT NULL DEFAULT 75;

-- Enable RLS on lesson_analytics
ALTER TABLE public.lesson_analytics ENABLE ROW LEVEL SECURITY;

-- Students can insert/update their own analytics
CREATE POLICY "Students can manage own analytics"
  ON public.lesson_analytics FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Staff can read all analytics
CREATE POLICY "Staff can read all analytics"
  ON public.lesson_analytics FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'editor'::app_role) OR 
    public.has_role(auth.uid(), 'professor'::app_role)
  );

-- Create unique constraint for upsert
ALTER TABLE public.lesson_analytics
  ADD CONSTRAINT lesson_analytics_student_lesson_date_unique 
  UNIQUE (student_id, lesson_id, date);
