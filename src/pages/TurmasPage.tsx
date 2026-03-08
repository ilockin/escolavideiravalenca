import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, Users, BookOpen, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTurmas, useCreateTurma, useDeleteTurma,
  useTurmaCourses, useTurmaStudents,
  useAddCourseToTurma, useRemoveCourseFromTurma,
  useAddStudentToTurma, useRemoveStudentFromTurma,
  useAllStudents,
} from '@/hooks/useTurmas';
import { useCourses } from '@/hooks/useCourses';

function CreateTurmaDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { user } = useAuth();
  const createTurma = useCreateTurma();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTurma.mutateAsync({ name: name.trim(), description: description.trim() || null, created_by: user?.id ?? null });
    setName('');
    setDescription('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Nova Turma</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar Nova Turma</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Turma</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Turma 2025.1" required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição..." rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={createTurma.isPending}>
            {createTurma.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Turma
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TurmaDetail({ turmaId, onClose }: { turmaId: string; onClose: () => void }) {
  const { data: turmaCourses = [], isLoading: loadingCourses } = useTurmaCourses(turmaId);
  const { data: turmaStudents = [], isLoading: loadingStudents } = useTurmaStudents(turmaId);
  const { data: allCourses = [] } = useCourses();
  const { data: allStudents = [] } = useAllStudents();
  const addCourse = useAddCourseToTurma();
  const removeCourse = useRemoveCourseFromTurma();
  const addStudent = useAddStudentToTurma();
  const removeStudent = useRemoveStudentFromTurma();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const linkedCourseIds = turmaCourses.map((tc: any) => tc.course_id);
  const linkedStudentIds = turmaStudents.map((ts: any) => ts.user_id);
  const availableCourses = allCourses.filter(c => !linkedCourseIds.includes(c.id));
  const availableStudents = allStudents.filter(s => !linkedStudentIds.includes(s.user_id));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="mr-1 h-4 w-4" /> Voltar
      </Button>

      {/* Courses Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5" />Cursos da Turma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar curso" /></SelectTrigger>
              <SelectContent>
                {availableCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                {availableCourses.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Todos os cursos já associados</div>}
              </SelectContent>
            </Select>
            <Button disabled={!selectedCourse || addCourse.isPending} onClick={() => {
              addCourse.mutate({ turma_id: turmaId, course_id: selectedCourse });
              setSelectedCourse('');
            }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {loadingCourses ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <div className="flex flex-wrap gap-2">
              {turmaCourses.map((tc: any) => (
                <Badge key={tc.id} variant="secondary" className="gap-1 pr-1">
                  {tc.courses?.title}
                  <button onClick={() => removeCourse.mutate({ turma_id: turmaId, course_id: tc.course_id })} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {turmaCourses.length === 0 && <p className="text-sm text-muted-foreground">Nenhum curso associado</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Alunos da Turma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
              <SelectContent>
                {availableStudents.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email || 'Sem nome'}</SelectItem>)}
                {availableStudents.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Todos os alunos já adicionados</div>}
              </SelectContent>
            </Select>
            <Button disabled={!selectedStudent || addStudent.isPending} onClick={() => {
              addStudent.mutate({ turma_id: turmaId, user_id: selectedStudent });
              setSelectedStudent('');
            }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {loadingStudents ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turmaStudents.map((ts: any) => (
                  <TableRow key={ts.id}>
                    <TableCell>{(ts.profiles as any)?.full_name || 'Sem nome'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => removeStudent.mutate({ turma_id: turmaId, user_id: ts.user_id })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {turmaStudents.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum aluno na turma</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TurmasPage() {
  const { data: turmas = [], isLoading } = useTurmas();
  const deleteTurma = useDeleteTurma();
  const [selectedTurma, setSelectedTurma] = useState<string | null>(null);
  const { role } = useAuth();
  const canManage = role === 'editor' || role === 'professor';

  if (selectedTurma) {
    const turma = turmas.find(t => t.id === selectedTurma);
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">{turma?.name ?? 'Turma'}</h1>
        <TurmaDetail turmaId={selectedTurma} onClose={() => setSelectedTurma(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Turmas</h1>
          <p className="text-muted-foreground">Gerencie turmas, cursos e alunos</p>
        </div>
        {canManage && <CreateTurmaDialog />}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {turmas.map(turma => (
          <Card key={turma.id} className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTurma(turma.id)}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{turma.name}</h3>
                    {turma.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{turma.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(turma.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canManage && (
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteTurma.mutate(turma.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && turmas.length === 0 && (
          <Card className="glass-card border-dashed flex items-center justify-center min-h-[200px] col-span-full">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma turma cadastrada</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Crie sua primeira turma para começar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
