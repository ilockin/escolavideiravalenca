import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Search, Users, Trophy, XCircle, CheckCircle, ChevronLeft, BarChart3, Loader2 } from 'lucide-react';

export default function RelatoriosProvasPage() {
  const [turmaFilter, setTurmaFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);

  const { data: turmas = [] } = useQuery({
    queryKey: ['turmas'],
    queryFn: async () => {
      const { data } = await supabase.from('turmas').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').order('title');
      return data ?? [];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons-with-quiz'],
    queryFn: async () => {
      const { data } = await supabase.from('lessons').select('id, title, module_id, has_quiz').eq('has_quiz', true);
      return data ?? [];
    },
  });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['all-quiz-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles-for-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name');
      return data ?? [];
    },
  });

  const { data: turmaStudentMap = {} } = useQuery({
    queryKey: ['turma-students-map'],
    enabled: turmaFilter !== 'all',
    queryFn: async () => {
      const { data } = await supabase.from('turma_students').select('user_id, turma_id').eq('turma_id', turmaFilter);
      const map: Record<string, boolean> = {};
      data?.forEach(d => { map[d.user_id] = true; });
      return map;
    },
  });

  const { data: moduleMap = {} } = useQuery({
    queryKey: ['modules-map'],
    queryFn: async () => {
      const { data } = await supabase.from('modules').select('id, course_id');
      const map: Record<string, string> = {};
      data?.forEach(m => { map[m.id] = m.course_id; });
      return map;
    },
  });

  const { data: questionsMap = {} } = useQuery({
    queryKey: ['quiz-questions-all'],
    queryFn: async () => {
      const { data } = await supabase.from('quiz_questions').select('id, question, lesson_id, options, correct_answer');
      const map: Record<string, any[]> = {};
      data?.forEach(q => {
        if (!map[q.lesson_id]) map[q.lesson_id] = [];
        map[q.lesson_id].push(q);
      });
      return map;
    },
  });

  const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name ?? 'Sem nome']));
  const lessonMap = new Map(lessons.map(l => [l.id, l]));

  // Build lesson -> course mapping via modules
  const lessonCourseMap = new Map<string, string>();
  lessons.forEach(l => {
    const courseId = moduleMap[l.module_id];
    if (courseId) lessonCourseMap.set(l.id, courseId);
  });

  // Filter attempts
  const filtered = attempts.filter(a => {
    if (turmaFilter !== 'all' && !turmaStudentMap[a.user_id]) return false;
    if (courseFilter !== 'all') {
      const lCourse = lessonCourseMap.get(a.lesson_id);
      if (lCourse !== courseFilter) return false;
    }
    if (lessonFilter !== 'all' && a.lesson_id !== lessonFilter) return false;
    if (search) {
      const name = profileMap.get(a.user_id)?.toLowerCase() ?? '';
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // Metrics
  const totalAttempts = filtered.length;
  const passedCount = filtered.filter(a => a.passed).length;
  const avgScore = totalAttempts > 0 ? Math.round(filtered.reduce((s, a) => s + Number(a.score), 0) / totalAttempts) : 0;
  const uniqueStudents = new Set(filtered.map(a => a.user_id)).size;

  if (selectedAttempt) {
    const lessonQuestions = questionsMap[selectedAttempt.lesson_id] ?? [];
    const studentAnswers = Array.isArray(selectedAttempt.answers) ? selectedAttempt.answers as any[] : [];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAttempt(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Detalhes da Tentativa</h2>
            <p className="text-sm text-muted-foreground">
              {profileMap.get(selectedAttempt.user_id)} — {lessonMap.get(selectedAttempt.lesson_id)?.title ?? 'Aula'}
            </p>
          </div>
          <Badge variant={selectedAttempt.passed ? 'default' : 'destructive'} className="ml-auto">
            {selectedAttempt.score}% — {selectedAttempt.passed ? 'Aprovado' : 'Reprovado'}
          </Badge>
        </div>

        <div className="space-y-3">
          {lessonQuestions.map((q: any, i: number) => {
            const sa = studentAnswers.find((a: any) => a.questionId === q.id);
            const isCorrect = sa?.isCorrect ?? false;
            const opts = Array.isArray(q.options) ? q.options as string[] : [];
            return (
              <Card key={q.id} className={`border ${isCorrect ? 'border-primary/30' : 'border-destructive/30'}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-2">
                    {isCorrect ? <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Questão {i + 1}: {q.question}</p>
                      <div className="mt-2 space-y-1">
                        {opts.map((opt: string, oi: number) => {
                          const isSelected = sa?.selected === oi;
                          const isRight = q.correct_answer === oi;
                          return (
                            <div key={oi} className={`px-3 py-1.5 rounded text-sm ${isRight ? 'bg-primary/10 text-primary font-medium' : isSelected ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'}`}>
                              {String(opt)} {isRight && '✓'} {isSelected && !isRight && '✗'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Relatórios de Provas
        </h1>
        <p className="text-muted-foreground">Acompanhe o desempenho dos alunos nos quizzes</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{totalAttempts}</p><p className="text-xs text-muted-foreground">Tentativas</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{uniqueStudents}</p><p className="text-xs text-muted-foreground">Alunos</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><Trophy className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-bold">{passedCount}</p><p className="text-xs text-muted-foreground">Aprovados</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-2xl font-bold">{avgScore}%</p><p className="text-xs text-muted-foreground">Média</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={turmaFilter} onValueChange={setTurmaFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Turmas</SelectItem>
            {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Curso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Cursos</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={lessonFilter} onValueChange={setLessonFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Aula" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Aulas</SelectItem>
            {lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno..." className="pl-9" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="glass-card">
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{profileMap.get(a.user_id) ?? 'Sem nome'}</TableCell>
                    <TableCell>{lessonMap.get(a.lesson_id)?.title ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Number(a.score)} className="h-2 w-16" />
                        <span className="text-sm">{a.score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.passed ? 'default' : 'destructive'} className="text-xs">
                        {a.passed ? 'Aprovado' : 'Reprovado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedAttempt(a)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma tentativa encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
