import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, GraduationCap, BarChart3, Clock, CheckCircle } from 'lucide-react';

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

export default function DashboardPage() {
  const { role } = useAuth();

  if (role === 'aluno') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Meu Painel</h1>
          <p className="text-muted-foreground">Acompanhe seu progresso</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={BookOpen} label="Cursos Matriculados" value="0" />
          <StatCard icon={CheckCircle} label="Aulas Concluídas" value="0" />
          <StatCard icon={BarChart3} label="Progresso Geral" value="0%" />
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Nenhuma atividade recente. Comece assistindo uma aula!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {role === 'editor' ? 'Visão geral da escola' : 'Visão geral das suas turmas'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Cursos Ativos" value="0" />
        <StatCard icon={Users} label="Alunos Matriculados" value="0" />
        <StatCard icon={Clock} label="Cadastros Pendentes" value="0" accent="bg-warning" />
        <StatCard icon={GraduationCap} label="Certificados Emitidos" value="0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Cadastros Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Nenhum cadastro pendente no momento.</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Nenhuma atividade recente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
