
-- Create turmas table
CREATE TABLE public.turmas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create turma_courses junction table
CREATE TABLE public.turma_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(turma_id, course_id)
);

-- Create turma_students junction table
CREATE TABLE public.turma_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(turma_id, user_id)
);

-- Enable RLS
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_students ENABLE ROW LEVEL SECURITY;

-- Turmas RLS
CREATE POLICY "Editors and professors can manage turmas" ON public.turmas
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can read own turmas" ON public.turmas
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.turma_students WHERE turma_students.turma_id = turmas.id AND turma_students.user_id = auth.uid()));

-- Turma_courses RLS
CREATE POLICY "Editors and professors can manage turma_courses" ON public.turma_courses
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can read own turma_courses" ON public.turma_courses
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.turma_students WHERE turma_students.turma_id = turma_courses.turma_id AND turma_students.user_id = auth.uid()));

-- Turma_students RLS
CREATE POLICY "Editors and professors can manage turma_students" ON public.turma_students
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can read own turma membership" ON public.turma_students
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Update courses RLS: replace the open SELECT policy with turma-based visibility
DROP POLICY IF EXISTS "Anyone authenticated can read courses" ON public.courses;

CREATE POLICY "Editors and professors can read all courses" ON public.courses
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'professor'));

CREATE POLICY "Students can read courses in their turmas" ON public.courses
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.turma_courses tc
  JOIN public.turma_students ts ON ts.turma_id = tc.turma_id
  WHERE tc.course_id = courses.id AND ts.user_id = auth.uid()
));
