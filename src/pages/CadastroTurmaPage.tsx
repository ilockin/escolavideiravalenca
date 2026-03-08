import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().trim().email('E-mail inválido').max(255),
  whatsapp: z.string().trim().min(10, 'WhatsApp inválido').max(20),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export default function CadastroTurmaPage() {
  const { code } = useParams<{ code: string }>();
  const [turma, setTurma] = useState<{ id: string; name: string } | null>(null);
  const [loadingTurma, setLoadingTurma] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!code) { setNotFound(true); setLoadingTurma(false); return; }
    supabase
      .from('turmas')
      .select('id, name')
      .eq('invite_code', code)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setTurma(data);
        setLoadingTurma(false);
      });
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = cadastroSchema.safeParse({ nome, email, whatsapp, senha });
    if (!result.success) {
      toast({ title: 'Erro de validação', description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }
    if (!turma) return;

    setLoading(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { full_name: nome } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (userId) {
        // Update profile with whatsapp
        await supabase.from('profiles').update({ whatsapp }).eq('user_id', userId);

        // Add student to turma
        await supabase.from('turma_students').insert({ turma_id: turma.id, user_id: userId });
      }

      // Sign out so the user confirms email first
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingTurma) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link inválido</h2>
            <p className="text-muted-foreground">Este link de cadastro não é válido ou a turma não existe.</p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">Ir para Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card w-full max-w-md text-center animate-fade-in">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Cadastro Realizado!</h2>
            <p className="text-muted-foreground">
              Você foi adicionado à turma <strong>{turma?.name}</strong>. Verifique seu e-mail para confirmar sua conta e depois faça login.
            </p>
            <Link to="/login">
              <Button className="mt-4">Ir para Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Escola Videira</h1>
          <p className="text-sm text-muted-foreground">Cadastro de Aluno</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Turma: {turma?.name}</CardTitle>
            <CardDescription>Preencha seus dados para se cadastrar nesta turma</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar na Turma
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
