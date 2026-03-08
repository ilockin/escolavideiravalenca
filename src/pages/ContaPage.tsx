import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserCog, Save, Lock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateStudentDialog } from '@/components/CreateStudentDialog';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  whatsapp: string | null;
}

interface UserWithProfile {
  user_id: string;
  full_name: string | null;
  whatsapp: string | null;
  email?: string;
}

function ProfileForm({
  profile,
  email,
  isOwnAccount,
  onSaved,
}: {
  profile: { user_id: string; full_name: string | null; whatsapp: string | null };
  email: string;
  isOwnAccount: boolean;
  onSaved?: () => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || '');
  const [newEmail, setNewEmail] = useState(email);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile.full_name || '');
    setWhatsapp(profile.whatsapp || '');
    setNewEmail(email);
    setNewPassword('');
  }, [profile, email]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), whatsapp: whatsapp.trim() || null })
        .eq('user_id', profile.user_id);
      if (profileError) throw profileError;

      if (isOwnAccount && newEmail !== email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
        if (emailError) throw emailError;
        toast({ title: 'Um email de confirmação foi enviado para o novo endereço' });
      }

      if (isOwnAccount && newPassword) {
        if (newPassword.length < 6) {
          toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
        if (passError) throw passError;
      }

      if (!isOwnAccount && newPassword) {
        if (newPassword.length < 6) {
          toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const response = await supabase.functions.invoke('admin-reset-password', {
          body: { target_user_id: profile.user_id, new_password: newPassword },
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
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={!isOwnAccount}
        />
        {!isOwnAccount && (
          <p className="text-xs text-muted-foreground">O email só pode ser alterado pelo próprio usuário</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">
          <Lock className="inline h-3.5 w-3.5 mr-1" />
          {isOwnAccount ? 'Nova senha' : 'Redefinir senha do aluno'}
        </Label>
        <Input
          id="password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={isOwnAccount ? 'Deixe em branco para manter a atual' : 'Nova senha para o aluno'}
        />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </div>
  );
}

export default function ContaPage() {
  const { user, role } = useAuth();
  const isStaff = role === 'editor' || role === 'professor';
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const queryClient = useQueryClient();

  const { data: ownProfile } = useQuery({
    queryKey: ['own-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  const currentRole = role;
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ['all-student-profiles', currentRole],
    queryFn: async () => {
    const rolesToFetch: Array<'aluno' | 'editor' | 'professor'> = currentRole === 'editor' ? ['aluno', 'professor'] : ['aluno'];
    const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', rolesToFetch);
      if (rolesError) throw rolesError;

      const studentIds = roles.map((r) => r.user_id);
      if (studentIds.length === 0) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', studentIds);
      if (error) throw error;

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id, student_email')
        .in('user_id', studentIds);

      const emailMap = new Map<string, string>();
      enrollments?.forEach((e) => {
        if (e.user_id) emailMap.set(e.user_id, e.student_email);
      });

      return (profiles as Profile[]).map((p) => ({
        ...p,
        email: emailMap.get(p.user_id) || '',
      }));
    },
    enabled: isStaff,
  });

  const filteredStudents = studentProfiles.filter(
    (s) =>
      !search ||
      (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['all-student-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['all-students'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Minha Conta</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      {ownProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Meus Dados
            </CardTitle>
            <CardDescription>Atualize suas informações pessoais e senha</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={ownProfile}
              email={user?.email || ''}
              isOwnAccount
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['own-profile'] })}
            />
          </CardContent>
        </Card>
      )}

      {isStaff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Gerenciar Contas</CardTitle>
              <CardDescription>Edite dados e redefina senhas dos alunos</CardDescription>
            </div>
            <CreateStudentDialog onSuccess={invalidateAll} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {filteredStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum aluno encontrado</p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                      <TableRow key={s.user_id}>
                        <TableCell className="font-medium">{s.full_name || '—'}</TableCell>
                        <TableCell>{s.email || '—'}</TableCell>
                        <TableCell>{s.whatsapp || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(s)}>
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <ProfileForm
              profile={editingUser}
              email={editingUser.email || ''}
              isOwnAccount={false}
              onSaved={() => {
                setEditingUser(null);
                invalidateAll();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
