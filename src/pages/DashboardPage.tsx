import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, GraduationCap, BarChart3, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
];

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) => (
  <Card className="glass-card hover:shadow-md transition-shadow">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent || 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${accent ? 'text-primary-foreground' : 'text-primary'}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [coursesRes, enrollmentsRes, progressRes, lessonsRes] = await Promise.all([
        supabase.from('courses').select('id, title'),
        supabase.from('enrollments').select('id, status, course_id, student_name, created_at, courses(title)'),
        supabase.from('lesson_progress').select('id, lesson_id, user_id, completed, quiz_score, lessons(module_id, modules(course_id))'),
        supabase.from('lessons').select('id, module_id, modules(course_id)'),
      ]);

      const courses = coursesRes.data ?? [];
      const enrollments = enrollmentsRes.data ?? [];
      const progress = progressRes.data ?? [];
      const lessons = lessonsRes.data ?? [];

      const pendentes = enrollments.filter((e) => e.status === 'pendente');
      const aprovados = enrollments.filter((e) => e.status === 'aprovado');

      // Lessons per course
      const lessonsByCourse: Record<string, number> = {};
      for (const l of lessons) {
        const cid = (l.modules as any)?.course_id;
        if (cid) lessonsByCourse[cid] = (lessonsByCourse[cid] || 0) + 1;
      }

      // Completed lessons per course
      const completedByCourse: Record<string, number> = {};
      for (const p of progress) {
        if (p.completed) {
          const cid = (p.lessons as any)?.modules?.course_id;
          if (cid) completedByCourse[cid] = (completedByCourse[cid] || 0) + 1;
        }
      }

      // Bar chart: progress per course
      const progressByCourseName = courses.map((c) => {
        const total = lessonsByCourse[c.id] || 0;
        const completed = completedByCourse[c.id] || 0;
        const enrolledCount = aprovados.filter((e) => e.course_id === c.id).length;
        const avgProgress = total > 0 && enrolledCount > 0 ? Math.round((completed / (total * enrolledCount)) * 100) : 0;
        return { name: c.title.length > 20 ? c.title.slice(0, 20) + '…' : c.title, progresso: Math.min(avgProgress, 100), alunos: enrolledCount };
      });

      // Pie chart: enrollment status distribution
      const statusData = [
        { name: 'Pendentes', value: pendentes.length },
        { name: 'Aprovados', value: aprovados.length },
        { name: 'Reprovados', value: enrollments.filter((e) => e.status === 'reprovado').length },
      ].filter((d) => d.value > 0);

      // Recent enrollments
      const recent = [...enrollments]
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, 5);

      return {
        totalCourses: courses.length,
        totalEnrolled: aprovados.length,
        totalPending: pendentes.length,
        totalCompleted: progress.filter((p) => p.completed).length,
        progressByCourseName,
        statusData,
        recent,
      };
    },
  });
}

function useStudentStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['student-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [enrollRes, progressRes] = await Promise.all([
        supabase.from('enrollments').select('id, course_id, courses(title)').eq('user_id', userId!).eq('status', 'aprovado'),
        supabase.from('lesson_progress').select('id, completed, lesson_id').eq('user_id', userId!),
      ]);
      const enrollments = enrollRes.data ?? [];
      const progress = progressRes.data ?? [];
      const completedCount = progress.filter((p) => p.completed).length;

      return {
        coursesEnrolled: enrollments.length,
        lessonsCompleted: completedCount,
        totalProgress: progress.length > 0 ? Math.round((completedCount / progress.length) * 100) : 0,
      };
    },
  });
}

export default function DashboardPage() {
  const { role, user } = useAuth();

  if (role === 'aluno') {
    return <StudentDashboard userId={user?.id} />;
  }

  return <AdminDashboard role={role} />;
}

function StudentDashboard({ userId }: { userId: string | undefined }) {
  const { data } = useStudentStats(userId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Meu Painel</h1>
        <p className="text-muted-foreground">Acompanhe seu progresso</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={BookOpen} label="Cursos Matriculados" value={String(data?.coursesEnrolled ?? 0)} />
        <StatCard icon={CheckCircle} label="Aulas Concluídas" value={String(data?.lessonsCompleted ?? 0)} />
        <StatCard icon={BarChart3} label="Progresso Geral" value={`${data?.totalProgress ?? 0}%`} />
      </div>
    </div>
  );
}

function AdminDashboard({ role }: { role: string | null }) {
  const { data, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {role === 'editor' ? 'Visão geral da escola' : 'Visão geral das suas turmas'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Cursos Ativos" value={String(data?.totalCourses ?? 0)} />
        <StatCard icon={Users} label="Alunos Aprovados" value={String(data?.totalEnrolled ?? 0)} />
        <StatCard icon={Clock} label="Cadastros Pendentes" value={String(data?.totalPending ?? 0)} accent="bg-primary" />
        <StatCard icon={GraduationCap} label="Aulas Concluídas" value={String(data?.totalCompleted ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Progresso Médio por Curso</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : data?.progressByCourseName?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.progressByCourseName} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={120} fontSize={12} tick={{ fill: 'hsl(var(--foreground))' }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Progresso']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="progresso" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum curso cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Status das Matrículas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : data?.statusData?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.statusData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                    {data.statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma matrícula registrada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data?.recent && data.recent.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Matrículas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{e.student_name}</p>
                    <p className="text-xs text-muted-foreground">{e.courses?.title ?? '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'aprovado' ? 'bg-primary/10 text-primary' : e.status === 'reprovado' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
