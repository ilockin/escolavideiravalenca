import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ArrowLeft, CheckCircle, Play, Lock, Loader2, Award, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LessonQuiz } from '@/components/LessonQuiz';
import { LessonComments } from '@/components/LessonComments';
import { generateCertificate } from '@/lib/generateCertificate';
import { useLessonTimer } from '@/hooks/useLessonTimer';
import type { Tables } from '@/integrations/supabase/types';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isModuleLocked(module: Tables<'modules'> | undefined): boolean {
  if (!module) return true;
  if (!module.is_released) return true;
  const now = new Date();
  if (module.release_date && new Date(module.release_date) > now) return true;
  if (module.close_date && new Date(module.close_date) < now) return true;
  return false;
}

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const isStaff = role === 'editor' || role === 'professor';

  // Track attendance time (only for students)
  useLessonTimer(!isStaff ? lessonId : undefined, !isStaff ? user?.id : undefined);

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

  // Fetch progress for all sibling lessons to check sequential completion
  const { data: siblingsProgress = [] } = useQuery({
    queryKey: ['siblings-progress', lesson?.module_id, user?.id],
    enabled: !!lesson?.module_id && !!user?.id && siblings.length > 0,
    queryFn: async () => {
      const ids = siblings.map(s => s.id);
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user!.id)
        .in('lesson_id', ids);
      if (error) throw error;
      return data ?? [];
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
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['lesson-progress', lessonId, user?.id] });
      qc.invalidateQueries({ queryKey: ['siblings-progress', lesson?.module_id, user?.id] });
      toast({ title: 'Aula concluída! ✅' });

      try {
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id, modules!inner(course_id)')
          .eq('modules.course_id', courseId!);

        if (!allLessons?.length) return;

        const lessonIds = allLessons.map((l) => l.id);
        const { data: allProgress } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user!.id)
          .in('lesson_id', lessonIds);

        const completedCount = allProgress?.filter((p) => p.completed).length ?? 0;

        if (completedCount >= allLessons.length) {
          const [profileRes, courseRes] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('user_id', user!.id).single(),
            supabase.from('courses').select('title').eq('id', courseId!).single(),
          ]);

          const studentName = profileRes.data?.full_name || user!.email || 'Aluno';
          const courseName = courseRes.data?.title || 'Curso';

          generateCertificate({ studentName, courseName, completionDate: new Date() });
          toast({ title: '🎓 Parabéns! Curso concluído!', description: 'Seu certificado foi gerado.' });
        }
      } catch {
        // silently ignore certificate generation errors
      }
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

  // Module lock check — staff bypasses
  const moduleLocked = !isStaff && isModuleLocked(module);

  if (moduleLocked) {
    const releaseDate = module?.release_date ? new Date(module.release_date) : null;
    const closeDate = module?.close_date ? new Date(module.close_date) : null;
    const now = new Date();
    const isClosed = closeDate && closeDate < now;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cursos/${courseId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold truncate">{lesson.title}</h1>
        </div>

        <Card className="border-destructive/30">
          <CardContent className="py-16 text-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-destructive/50 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Módulo Bloqueado</h2>
            {isClosed ? (
              <p className="text-muted-foreground max-w-md mx-auto">
                Este módulo foi encerrado em{' '}
                <span className="font-medium text-foreground">
                  {closeDate!.toLocaleDateString('pt-BR')}
                </span>
                . O conteúdo não está mais disponível.
              </p>
            ) : releaseDate && releaseDate > now ? (
              <p className="text-muted-foreground max-w-md mx-auto">
                Este módulo será liberado em{' '}
                <span className="font-medium text-foreground">
                  {releaseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>.
              </p>
            ) : (
              <p className="text-muted-foreground max-w-md mx-auto">
                Este módulo ainda não foi liberado pelo professor. Aguarde a liberação.
              </p>
            )}
            <Button variant="outline" onClick={() => navigate(`/cursos/${courseId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao curso
            </Button>
          </CardContent>
        </Card>
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

  // Check if current lesson is completed before allowing next
  const canGoNext = isStaff || isCompleted;

  const handleQuizPass = (score: number) => {
    setQuizPassed(true);
    setQuizScore(score);
  };

  // Helper: check if a sibling lesson is accessible (all previous must be completed)
  const isSiblingAccessible = (index: number): boolean => {
    if (isStaff) return true;
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      const prevId = siblings[i]?.id;
      const prevDone = siblingsProgress.find(p => p.lesson_id === prevId)?.completed;
      if (!prevDone) return false;
    }
    return true;
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

      {/* Description & Links */}
      {((lesson as any).description || (Array.isArray((lesson as any).external_links) && (lesson as any).external_links.length > 0)) && (
        <Card className="glass-card">
          <CardContent className="py-4 space-y-3">
            {(lesson as any).description && (
              <div>
                <p className="text-sm font-medium mb-1">Descrição</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(lesson as any).description}</p>
              </div>
            )}
            {Array.isArray((lesson as any).external_links) && (lesson as any).external_links.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Links Externos</p>
                <div className="space-y-1">
                  {((lesson as any).external_links as string[]).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline truncate">{link}</a>
                  ))}
                </div>
              </div>
            )}
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
          disabled={!nextLesson || !canGoNext}
          onClick={() => nextLesson && canGoNext && navigate(`/cursos/${courseId}/aula/${nextLesson.id}`)}
          title={!canGoNext ? 'Conclua esta aula antes de avançar' : undefined}
        >
          {!canGoNext && <Lock className="mr-1 h-3 w-3" />}
          Próxima →
        </Button>
      </div>

      {/* Comments */}
      <LessonComments lessonId={lessonId!} />

      {/* Lesson List */}
      <Card className="glass-card">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Aulas deste módulo</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {siblings.map((s, i) => {
            const accessible = isSiblingAccessible(i);
            const isCurrent = s.id === lessonId;
            const siblingDone = siblingsProgress.find(p => p.lesson_id === s.id)?.completed;

            return (
              <button
                key={s.id}
                onClick={() => accessible && navigate(`/cursos/${courseId}/aula/${s.id}`)}
                disabled={!accessible}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors text-sm ${
                  isCurrent
                    ? 'bg-primary/10 text-primary font-medium'
                    : accessible
                      ? 'hover:bg-accent/50 text-foreground'
                      : 'opacity-50 cursor-not-allowed text-muted-foreground'
                }`}
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium shrink-0 ${
                  isCurrent ? 'bg-primary text-primary-foreground' : siblingDone ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {siblingDone ? <CheckCircle className="h-3.5 w-3.5" /> : accessible ? i + 1 : <Lock className="h-3 w-3" />}
                </div>
                <span className="truncate">{s.title}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
