import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, Play, Loader2, Layers, HelpCircle, Lock, Unlock, Pencil } from 'lucide-react';
import { useModules, useLessons, useCreateModule, useDeleteModule, useCreateLesson, useDeleteLesson } from '@/hooks/useCourses';
import type { Module } from '@/hooks/useCourses';
import { QuizEditor } from '@/components/QuizEditor';
import { ModuleSettingsDialog } from '@/components/ModuleSettingsDialog';
import { LessonEditDialog } from '@/components/LessonEditDialog';
import { startOfDay } from 'date-fns';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isModuleLocked(module: Module): boolean {
  const today = startOfDay(new Date());
  
  // If module is not released, it's locked
  if (!module.is_released) return true;
  
  // If there's a release date, check if today is before release date
  if (module.release_date) {
    const releaseDate = startOfDay(new Date(module.release_date));
    if (today < releaseDate) return true;
  }
  
  // If there's a close date, check if today is after close date
  if (module.close_date) {
    const closeDate = startOfDay(new Date(module.close_date));
    if (today > closeDate) return true;
  }
  
  return false;
}

function LessonsList({ moduleId, courseId, canEdit, locked }: { moduleId: string; courseId: string; canEdit: boolean; locked: boolean }) {
  const { data: lessons = [], isLoading } = useLessons(moduleId);
  const navigate = useNavigate();
  const deleteLesson = useDeleteLesson();
  const createLesson = useCreateLesson();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createLesson.mutateAsync({
      module_id: moduleId,
      title: title.trim(),
      youtube_url: youtubeUrl.trim() || null,
      position: lessons.length,
    });
    setTitle('');
    setYoutubeUrl('');
    setOpen(false);
  };

  return (
    <div className="space-y-2 pl-4 border-l-2 border-border/50">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {lessons.map((lesson, i) => {
        const videoId = lesson.youtube_url ? extractYouTubeId(lesson.youtube_url) : null;
        return (
          <div
            key={lesson.id}
            className={`flex items-center gap-3 p-2 rounded-lg group ${
              locked
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-accent/50 cursor-pointer'
            }`}
            onClick={() => !locked && navigate(`/cursos/${courseId}/aula/${lesson.id}`)}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-medium shrink-0">
              {locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{lesson.title}</p>
              <div className="flex items-center gap-2">
                {videoId && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Play className="h-3 w-3" /> YouTube
                  </p>
                )}
                {lesson.has_quiz && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" /> Quiz
                  </p>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <LessonEditDialog lesson={lesson} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Editar Quiz"
                  onClick={(e) => { e.stopPropagation(); setQuizLessonId(lesson.id); }}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteLesson.mutate({ id: lesson.id, moduleId }); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
      {lessons.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground py-2">Nenhuma aula neste módulo</p>
      )}
      {canEdit && (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs mt-1">
                <Plus className="h-3 w-3 mr-1" /> Adicionar Aula
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Aula</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título da Aula</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Introdução" required />
                </div>
                <div className="space-y-2">
                  <Label>Link do YouTube</Label>
                  <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <Button type="submit" className="w-full" disabled={createLesson.isPending}>
                  {createLesson.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Aula
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!quizLessonId} onOpenChange={(v) => !v && setQuizLessonId(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Quiz</DialogTitle>
              </DialogHeader>
              {quizLessonId && <QuizEditor lessonId={quizLessonId} />}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export function ModuleLessonManager({ courseId, canEdit }: { courseId: string; canEdit: boolean }) {
  const { data: modules = [], isLoading } = useModules(courseId);
  const createModule = useCreateModule();
  const deleteModule = useDeleteModule();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createModule.mutateAsync({
      course_id: courseId,
      title: title.trim(),
      position: modules.length,
    });
    setTitle('');
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Módulos & Aulas
        </h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Módulo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Módulo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do Módulo</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Módulo 1 - Fundamentos" required />
                </div>
                <Button type="submit" className="w-full" disabled={createModule.isPending}>
                  {createModule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Módulo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando módulos...</p>}

      {modules.length === 0 && !isLoading && (
        <Card className="glass-card border-dashed">
          <CardContent className="py-8 text-center">
            <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum módulo criado</p>
          </CardContent>
        </Card>
      )}

      {modules.map((mod, i) => (
        <ModuleItem key={mod.id} module={mod} index={i} canEdit={canEdit} onDelete={() => deleteModule.mutate({ id: mod.id, courseId })} />
      ))}
    </div>
  );
}

function ModuleItem({ module, index, canEdit, onDelete }: { module: Module; index: number; canEdit: boolean; onDelete: () => void }) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const { role } = useAuth();
  const isStaff = role === 'editor' || role === 'professor';
  const locked = !isStaff && isModuleLocked(module);

  return (
    <Card className={`glass-card ${locked ? 'opacity-75' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-accent/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  locked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  {locked ? <Lock className="h-4 w-4" /> : index + 1}
                </div>
                <CardTitle className="text-base">{module.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {!isModuleLocked(module) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    <Unlock className="h-3 w-3" /> Aberto
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                    <Lock className="h-3 w-3" /> Fechado
                  </span>
                )}
                {canEdit && <ModuleSettingsDialog module={module} />}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {locked && (
              <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0" />
                <span>
                  {module.release_date && startOfDay(new Date(module.release_date)) > startOfDay(new Date())
                    ? `Liberação em ${new Date(module.release_date).toLocaleDateString('pt-BR')}`
                    : module.close_date && startOfDay(new Date(module.close_date)) < startOfDay(new Date())
                      ? 'Este módulo foi encerrado'
                      : 'Módulo bloqueado pelo professor'}
                </span>
              </div>
            )}
            <LessonsList moduleId={module.id} courseId={module.course_id} canEdit={canEdit} locked={locked} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
