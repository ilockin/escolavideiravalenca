import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CsvImportDialog } from '@/components/CsvImportDialog';

interface Enrollment {
  id: string;
  student_name: string;
  student_email: string;
  student_whatsapp: string | null;
  status: string | null;
  created_at: string | null;
  approved_at: string | null;
  course_id: string | null;
  courses: { title: string } | null;
}

export default function AlunosPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Enrollment[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'aprovado') updates.approved_at = new Date().toISOString();
      const { error } = await supabase.from('enrollments').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast({ title: 'Status atualizado com sucesso' });
    },
  });

  const filtered = (status: string) =>
    enrollments
      .filter((e) => e.status === status)
      .filter(
        (e) =>
          !search ||
          e.student_name.toLowerCase().includes(search.toLowerCase()) ||
          e.student_email.toLowerCase().includes(search.toLowerCase())
      );

  const EmptyState = ({ message }: { message: string }) => (
    <Card className="glass-card">
      <CardContent className="py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  const EnrollmentTable = ({ items, showActions }: { items: Enrollment[]; showActions?: boolean }) => {
    if (items.length === 0) return <EmptyState message="Nenhum aluno encontrado" />;
    return (
      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Data</TableHead>
              {showActions && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.student_name}</TableCell>
                <TableCell>{e.student_email}</TableCell>
                <TableCell>{e.student_whatsapp || '—'}</TableCell>
                <TableCell>{e.courses?.title || '—'}</TableCell>
                <TableCell>{e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                {showActions && (
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: e.id, status: 'aprovado' })} disabled={updateStatus.isPending}>
                      <Check className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: e.id, status: 'reprovado' })} disabled={updateStatus.isPending}>
                      <X className="h-4 w-4 mr-1" /> Reprovar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos matriculados</p>
        </div>
        <CsvImportDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['enrollments'] })} />
      </div>

      <Tabs defaultValue="pendentes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({filtered('pendente').length})</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados ({filtered('aprovado').length})</TabsTrigger>
          <TabsTrigger value="reprovados">Reprovados ({filtered('reprovado').length})</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="pendentes" className="mt-4">
          {isLoading ? <p>Carregando...</p> : <EnrollmentTable items={filtered('pendente')} showActions />}
        </TabsContent>
        <TabsContent value="aprovados" className="mt-4">
          {isLoading ? <p>Carregando...</p> : <EnrollmentTable items={filtered('aprovado')} />}
        </TabsContent>
        <TabsContent value="reprovados" className="mt-4">
          {isLoading ? <p>Carregando...</p> : <EnrollmentTable items={filtered('reprovado')} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
