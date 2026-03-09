import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ArrowLeft, Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useTurmas } from '@/hooks/useTurmas';

const MIN_ATTENDANCE_SECONDS = 300;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Aprovado') return <Badge className="bg-primary/15 text-primary border-primary/30">Aprovado</Badge>;
  if (status === 'Recuperação') return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">Recuperação</Badge>;
  return <Badge variant="destructive">Reprovado</Badge>;
}

interface StudentDetail {
  userId: string;
  name: string;
}

function StudentHistory({ student, turmaId, onBack }: { student: StudentDetail; turmaId: string; onBack: () => void }) {
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['student-analytics', student.userId, turmaId],
    queryFn: async () => {
      // Get lessons from turma courses
      const { data: tc } = await supabase
        .from('turma_courses')
        .select('course_id')
        .eq('turma_id', turmaId);
      if (!tc?.length) return [];

      const courseIds = tc.map(c => c.course_id);
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .in('course_id', courseIds);
      if (!modules?.length) return [];

      const moduleIds = modules.map(m => m.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title')
        .in('module_id', moduleIds);
      if (!lessons?.length) return [];

      const lessonIds = lessons.map(l => l.id);
      const { data: records } = await supabase
        .from('lesson_analytics')
        .select('*')
        .eq('student_id', student.userId)
        .in('lesson_id', lessonIds)
        .order('date', { ascending: false });

      const lessonMap = new Map(lessons.map(l => [l.id, l.title]));
      return (records ?? []).map(r => ({
        ...r,
        lesson_title: lessonMap.get(r.lesson_id) || 'Aula',
      }));
    },
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>
      <h2 className="text-lg font-semibold">{student.name} — Histórico de Presença</h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : analytics.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum registro de presença encontrado.</p>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Presença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.lesson_title}</TableCell>
                    <TableCell>{formatDuration(r.duration_seconds)}</TableCell>
                    <TableCell>
                      {r.duration_seconds >= MIN_ATTENDANCE_SECONDS ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30 gap-1"><CheckCircle className="h-3 w-3" />Presente</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground gap-1"><XCircle className="h-3 w-3" />Insuficiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PresencaPage() {
  const { data: turmas = [], isLoading: loadingTurmas } = useTurmas();
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);

  const turma = turmas.find(t => t.id === selectedTurma);

  // Fetch students and their analytics for selected turma
  const { data: studentsData = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['presenca-students', selectedTurma],
    enabled: !!selectedTurma,
    queryFn: async () => {
      // Get students in turma
      const { data: ts } = await supabase
        .from('turma_students')
        .select('user_id')
        .eq('turma_id', selectedTurma);
      if (!ts?.length) return [];

      const studentIds = ts.map(s => s.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      // Get lessons from turma courses
      const { data: tc } = await supabase
        .from('turma_courses')
        .select('course_id')
        .eq('turma_id', selectedTurma);

      let totalLessons = 0;
      let lessonIds: string[] = [];

      if (tc?.length) {
        const courseIds = tc.map(c => c.course_id);
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .in('course_id', courseIds);

        if (modules?.length) {
          const moduleIds = modules.map(m => m.id);
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .in('module_id', moduleIds);
          totalLessons = lessons?.length ?? 0;
          lessonIds = lessons?.map(l => l.id) ?? [];
        }
      }

      // Get analytics for all students
      let analyticsMap = new Map<string, number>();
      if (lessonIds.length && studentIds.length) {
        const { data: analytics } = await supabase
          .from('lesson_analytics')
          .select('student_id, lesson_id, duration_seconds')
          .in('student_id', studentIds)
          .in('lesson_id', lessonIds);

        // Count distinct lessons with valid attendance per student
        const studentLessons = new Map<string, Set<string>>();
        analytics?.forEach(a => {
          if (a.duration_seconds >= MIN_ATTENDANCE_SECONDS) {
            if (!studentLessons.has(a.student_id)) studentLessons.set(a.student_id, new Set());
            studentLessons.get(a.student_id)!.add(a.lesson_id);
          }
        });
        studentLessons.forEach((lessons, sid) => analyticsMap.set(sid, lessons.size));
      }

      const minPercent = (turma as any)?.min_attendance_percent ?? 75;

      return (profiles ?? []).map(p => {
        const validLessons = analyticsMap.get(p.user_id) || 0;
        const percent = totalLessons > 0 ? (validLessons / totalLessons) * 100 : 0;
        let status = 'Reprovado';
        if (percent >= minPercent) status = 'Aprovado';
        else if (percent >= minPercent * 0.7) status = 'Recuperação';

        return {
          userId: p.user_id,
          name: p.full_name || 'Sem nome',
          validLessons,
          totalLessons,
          percent: Math.round(percent),
          status,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return studentsData;
    const q = search.toLowerCase();
    return studentsData.filter(s => s.name.toLowerCase().includes(q));
  }, [studentsData, search]);

  // Metrics
  const totalStudents = studentsData.length;
  const approved = studentsData.filter(s => s.status === 'Aprovado').length;
  const recovery = studentsData.filter(s => s.status === 'Recuperação').length;
  const failed = studentsData.filter(s => s.status === 'Reprovado').length;

  if (selectedStudent && selectedTurma) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Gestão de Presença</h1>
        <StudentHistory student={selectedStudent} turmaId={selectedTurma} onBack={() => setSelectedStudent(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Presença</h1>
        <p className="text-muted-foreground">Acompanhe a frequência e status dos alunos por turma</p>
      </div>

      {/* Turma Selector */}
      <Select value={selectedTurma} onValueChange={v => { setSelectedTurma(v); setSelectedStudent(null); }}>
        <SelectTrigger className="w-full max-w-sm">
          <SelectValue placeholder="Selecionar turma" />
        </SelectTrigger>
        <SelectContent>
          {turmas.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {loadingTurmas && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {selectedTurma && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Alunos</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{approved}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{recovery}</p>
                <p className="text-xs text-muted-foreground">Recuperação</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <XCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold">{failed}</p>
                <p className="text-xs text-muted-foreground">Reprovados</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Student Table */}
          {loadingStudents ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-center">Presenças</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(s => (
                      <TableRow
                        key={s.userId}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setSelectedStudent({ userId: s.userId, name: s.name })}
                      >
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-center">{s.validLessons}/{s.totalLessons}</TableCell>
                        <TableCell className="text-center">{s.percent}%</TableCell>
                        <TableCell className="text-center"><StatusBadge status={s.status} /></TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum aluno encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Min attendance info */}
          {turma && (
            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Presença mínima: {(turma as any).min_attendance_percent ?? 75}% · Tempo mínimo por aula: 5 minutos
            </p>
          )}
        </>
      )}
    </div>
  );
}
