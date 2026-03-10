import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditTurmaDialogProps {
  turma: {
    id: string;
    name: string;
    description: string | null;
    start_date?: string | null;
    end_date?: string | null;
    min_attendance_percent?: number;
  };
}

export function EditTurmaDialog({ turma }: EditTurmaDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(turma.name);
  const [description, setDescription] = useState(turma.description ?? '');
  const [startDate, setStartDate] = useState(turma.start_date ?? '');
  const [endDate, setEndDate] = useState(turma.end_date ?? '');
  const [minAttendance, setMinAttendance] = useState(String(turma.min_attendance_percent ?? 75));
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(turma.name);
      setDescription(turma.description ?? '');
      setStartDate(turma.start_date ?? '');
      setEndDate(turma.end_date ?? '');
      setMinAttendance(String(turma.min_attendance_percent ?? 75));
    }
  }, [open, turma]);

  const updateTurma = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('turmas').update({
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        min_attendance_percent: parseFloat(minAttendance) || 75,
      }).eq('id', turma.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      toast({ title: 'Turma atualizada!' });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()} title="Editar turma">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Editar Turma</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); updateTurma.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Aprovação Mínima (%)</Label>
            <Input type="number" min="0" max="100" value={minAttendance} onChange={e => setMinAttendance(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={updateTurma.isPending}>
            {updateTurma.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
