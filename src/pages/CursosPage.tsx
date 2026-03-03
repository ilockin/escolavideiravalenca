import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/hooks/useCourses';
import { CourseFormDialog } from '@/components/CourseFormDialog';

export default function CursosPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { data: courses = [], isLoading } = useCourses();
  const canCreate = role === 'editor';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cursos</h1>
          <p className="text-muted-foreground">Gerencie os cursos da escola</p>
        </div>
        {canCreate && <CourseFormDialog />}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <Card
            key={course.id}
            className="glass-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/cursos/${course.id}`)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{course.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(course.created_at!).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && courses.length === 0 && (
          <Card className="glass-card border-dashed flex items-center justify-center min-h-[200px] col-span-full">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum curso cadastrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {canCreate ? 'Crie seu primeiro curso para começar' : 'Aguarde até que cursos sejam cadastrados'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
