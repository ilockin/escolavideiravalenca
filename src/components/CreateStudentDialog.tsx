import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const createStudentSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().trim().email('E-mail inválido').max(255),
  whatsapp: z.string().trim().max(20).optional(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

interface CreateStudentDialogProps {
  onSuccess?: () => void;
}

export function CreateStudentDialog({ onSuccess }: CreateStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; name: string } | null>(null);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setWhatsapp('');
    setPassword('');
    setCreatedUser(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = createStudentSchema.safeParse({ full_name: fullName, email, whatsapp, password });
    if (!result.success) {
      toast({ title: 'Erro de validação', description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-create-user', {
        body: { email, password, full_name: fullName, whatsapp: whatsapp || null },
      });

      if (response.error) throw new Error(response.error.message || 'Erro ao criar aluno');
      const data = response.data as any;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Aluno criado com sucesso!' });
      setCreatedUser({ email, password, name: fullName });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Erro ao criar aluno', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!createdUser) return;
    setSendingEmail(true);
    try {
      const response = await supabase.functions.invoke('send-credentials-email', {
        body: {
          target_email: createdUser.email,
          target_password: createdUser.password,
          target_name: createdUser.name,
        },
      });

      if (response.error) throw new Error(response.error.message);
      const data = response.data as any;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'E-mail enviado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar e-mail', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Aluno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
        </DialogHeader>

        {createdUser ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Aluno criado com sucesso!</p>
              <p className="text-sm"><strong>Nome:</strong> {createdUser.name}</p>
              <p className="text-sm"><strong>E-mail:</strong> {createdUser.email}</p>
              <p className="text-sm"><strong>Senha:</strong> {createdUser.password}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendEmail} disabled={sendingEmail} className="flex-1">
                <Mail className="mr-2 h-4 w-4" />
                {sendingEmail ? 'Enviando...' : 'Enviar credenciais por e-mail'}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { resetForm(); }}>
              Cadastrar outro aluno
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome completo</Label>
              <Input id="create-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do aluno" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">E-mail</Label>
              <Input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-whatsapp">WhatsApp</Label>
              <Input id="create-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha de acesso</Label>
              <Input id="create-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Aluno
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
