import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, Check, X, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CsvImportDialog } from '@/components/CsvImportDialog';
import { CreateStudentDialog } from '@/components/CreateStudentDialog';
import { useAllStudents, type StudentProfile } from '@/hooks/useTurmas';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

function EditStudentForm({
  student,
  onSaved,
}: {
  student: StudentProfile;
  onSaved?: () => void;
}) {
  const [fullName, setFullName] = useState(student.full_name || '');
  const [whatsapp, setWhatsapp] = useState(student.whatsapp || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), whatsapp: whatsapp.trim() || null })
        .eq('user_id', student.user_id);
      if (profileError) throw profileError;

      if (newPassword) {
        if (newPassword.length < 6) {
          toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const response = await supabase.functions.invoke('admin-reset-password', {
          body: { target_user_id: student.user_id, new_password: newPassword },
        });
        if (response.error) throw new Error(response.error.message || 'Erro ao redefinir senha');
        const result = response.data as any;
        if (result?.error) throw new Error(result.error);
      }

      toast({ title: 'Dados atualizados com sucesso' });
      setNewPassword('');
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome completo</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={student.email || ''} disabled />
        <p className="text-xs text-muted-foreground">O email só pode ser alterado pelo próprio usuário</p>
      </div>
      <div className="space-y-2">
        <Label>WhatsApp</Label>
        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
      </div>
      <div className="space-y-2">
        <Label>
          <Lock className="inline h-3.5 w-3.5 mr-1" />
          Redefinir senha do aluno
        </Label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova senha para o aluno"
        />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </div>
  );
}

export default function AlunosPage() {
  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isStaff = role === 'editor' || role === 'professor';

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

  const { data: allStudents = [], isLoading: loadingStudents } = useAllStudents();

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

  const filteredAllStudents = allStudents.filter(
    (s) =>
      !search ||
      (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase())
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['all-students'] });
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos matriculados</p>
        </div>
        <div className="flex gap-2">
          {isStaff && <CreateStudentDialog onSuccess={invalidateAll} />}
          <CsvImportDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['enrollments'] })} />
        </div>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList>
          <TabsTrigger value="todos">Todos ({allStudents.length})</TabsTrigger>
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

        <TabsContent value="todos" className="mt-4">
          {loadingStudents ? (
            <p>Carregando...</p>
          ) : filteredAllStudents.length === 0 ? (
            <EmptyState message="Nenhum aluno cadastrado" />
          ) : (
            <Card className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    {isStaff && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllStudents.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">{s.full_name || '—'}</TableCell>
                      <TableCell>{s.email || '—'}</TableCell>
                      <TableCell>{s.whatsapp || '—'}</TableCell>
                      {isStaff && (
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingStudent(s)}
                            title="Editar aluno"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
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

      {/* Edit student dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <EditStudentForm
              student={editingStudent}
              onSaved={() => {
                setEditingStudent(null);
                invalidateAll();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
