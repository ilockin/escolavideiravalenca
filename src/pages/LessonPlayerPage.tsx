import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ArrowLeft, CheckCircle, Play, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LessonQuiz } from '@/components/LessonQuiz';
import type { Tables } from '@/integrations/supabase/types';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const { data: lesson, isLoading: loadingLesson } = useQuery({
    queryKey: ['lesson', lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId!)
        .single();
      if (error) throw error;
      return data as Tables<'lessons'>;
    },
  });

  const { data: module } = useQuery({
    queryKey: ['module-single', lesson?.module_id],
    enabled: !!lesson?.module_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', lesson!.module_id)
        .single();
      if (error) throw error;
      return data as Tables<'modules'>;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ['lesson-progress', lessonId, user?.id],
    enabled: !!lessonId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'lesson_progress'> | null;
    },
  });

  const { data: siblings = [] } = useQuery({
    queryKey: ['lessons', lesson?.module_id],
    enabled: !!lesson?.module_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', lesson!.module_id)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Tables<'lessons'>[];
    },
  });

  const completeLesson = useMutation({
    mutationFn: async () => {
      if (progress?.completed) return;
      const { error } = await supabase.from('lesson_progress').upsert({
        lesson_id: lessonId!,
        user_id: user!.id,
        completed: true,
        completed_at: new Date().toISOString(),
        quiz_score: quizScore,
      }, { onConflict: 'lesson_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-progress', lessonId, user?.id] });
      toast({ title: 'Aula concluída! ✅' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  if (loadingLesson) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Aula não encontrada</p>
        <Button variant="link" onClick={() => navigate(`/cursos/${courseId}`)}>Voltar ao curso</Button>
      </div>
    );
  }

  const videoId = lesson.youtube_url ? extractYouTubeId(lesson.youtube_url) : null;
  const currentIndex = siblings.findIndex(s => s.id === lessonId);
  const prevLesson = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextLesson = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
  const isCompleted = progress?.completed === true;
  const hasQuiz = lesson.has_quiz === true;
  const canComplete = !hasQuiz || quizPassed || isCompleted;

  const handleQuizPass = (score: number) => {
    setQuizPassed(true);
    setQuizScore(score);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cursos/${courseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {module && <p className="text-xs text-muted-foreground">{module.title}</p>}
          <h1 className="text-xl font-bold truncate">{lesson.title}</h1>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1.5 text-primary text-sm font-medium shrink-0">
            <CheckCircle className="h-4 w-4" />
            Concluída
          </div>
        )}
      </div>

      {/* Video Player */}
      {videoId ? (
        <Card className="glass-card overflow-hidden">
          <AspectRatio ratio={16 / 9}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </AspectRatio>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <Play className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum vídeo associado a esta aula</p>
          </CardContent>
        </Card>
      )}

      {/* Quiz Section */}
      {hasQuiz && !isCompleted && (
        <LessonQuiz lessonId={lessonId!} onPass={handleQuizPass} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={!prevLesson}
          onClick={() => prevLesson && navigate(`/cursos/${courseId}/aula/${prevLesson.id}`)}
        >
          ← Anterior
        </Button>

        {!isCompleted ? (
          <Button
            onClick={() => completeLesson.mutate()}
            disabled={completeLesson.isPending || !canComplete}
            className="px-6"
          >
            {completeLesson.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : !canComplete ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {!canComplete ? 'Complete o Quiz (60%)' : 'Concluir Aula'}
          </Button>
        ) : (
          <div />
        )}

        <Button
          variant="outline"
          disabled={!nextLesson}
          onClick={() => nextLesson && navigate(`/cursos/${courseId}/aula/${nextLesson.id}`)}
        >
          Próxima →
        </Button>
      </div>

      {/* Lesson List */}
      <Card className="glass-card">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Aulas deste módulo</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {siblings.map((s, i) => (
            <button
              key={s.id}
              onClick={() => navigate(`/cursos/${courseId}/aula/${s.id}`)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors text-sm ${
                s.id === lessonId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent/50 text-foreground'
              }`}
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium shrink-0 ${
                s.id === lessonId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
