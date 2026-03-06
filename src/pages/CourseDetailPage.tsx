import { useParams, useNavigate } from 'react-router-dom';
import { useCourse, useDeleteCourse } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { ModuleLessonManager } from '@/components/ModuleLessonManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Link as LinkIcon, Copy, Loader2, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateCertificate } from '@/lib/generateCertificate';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { data: course, isLoading } = useCourse(id);
  const deleteCourse = useDeleteCourse();
  const { toast } = useToast();
  const canEdit = role === 'editor';
  const isStudent = role === 'aluno';

  // Check if current student completed 100% of the course
  const { data: courseCompletion } = useQuery({
    queryKey: ['course-completion', id, user?.id],
    enabled: isStudent && !!id && !!user?.id,
    queryFn: async () => {
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, modules!inner(course_id)')
        .eq('modules.course_id', id!);
      if (!allLessons?.length) return { completed: false, total: 0, done: 0 };

      const lessonIds = allLessons.map((l) => l.id);
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user!.id)
        .in('lesson_id', lessonIds);

      const done = progress?.filter((p) => p.completed).length ?? 0;
      return { completed: done >= allLessons.length, total: allLessons.length, done };
    },
  });

  const handleDownloadCertificate = async () => {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).single();
    generateCertificate({
      studentName: profile?.full_name || user!.email || 'Aluno',
      courseName: course?.title || 'Curso',
      completionDate: new Date(),
    });
  };

  const enrollmentLink = `${window.location.origin}/cadastro?curso_id=${id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(enrollmentLink);
    toast({ title: 'Link copiado!' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Curso não encontrado</p>
        <Button variant="link" onClick={() => navigate('/cursos')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cursos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && <p className="text-muted-foreground mt-1">{course.description}</p>}
        </div>
        {canEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os módulos e aulas serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground"
                  onClick={async () => {
                    await deleteCourse.mutateAsync(course.id);
                    navigate('/cursos');
                  }}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Enrollment Link */}
      <Card className="glass-card">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <LinkIcon className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Link de Cadastro</p>
              <p className="text-xs text-muted-foreground truncate">{enrollmentLink}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules & Lessons */}
      <ModuleLessonManager courseId={course.id} canEdit={canEdit} />
    </div>
  );
}
