import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { useCreateCourse, useProfessors } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';

export function CourseFormDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [professorId, setProfessorId] = useState('');
  const { user } = useAuth();
  const createCourse = useCreateCourse();
  const { data: professors = [] } = useProfessors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createCourse.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      professor_id: professorId || null,
      created_by: user?.id ?? null,
    });
    setTitle('');
    setDescription('');
    setProfessorId('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Curso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Curso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Curso</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Fundamentos da Fé" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do curso..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Professor Responsável</Label>
            <Select value={professorId} onValueChange={setProfessorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar professor" />
              </SelectTrigger>
              <SelectContent>
                {professors.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name || p.user_id}
                  </SelectItem>
                ))}
                {professors.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum professor cadastrado</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={createCourse.isPending}>
            {createCourse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Curso
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
