import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Loader2, Plus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LessonEditDialogProps {
  lesson: {
    id: string;
    module_id: string;
    title: string;
    youtube_url: string | null;
    description?: string | null;
    external_links?: any;
  };
}

export function LessonEditDialog({ lesson }: LessonEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtube_url ?? '');
  const [description, setDescription] = useState((lesson as any).description ?? '');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTitle(lesson.title);
      setYoutubeUrl(lesson.youtube_url ?? '');
      setDescription((lesson as any).description ?? '');
      const existing = Array.isArray((lesson as any).external_links) ? (lesson as any).external_links as string[] : [];
      setLinks(existing);
      setNewLink('');
    }
  }, [open, lesson]);

  const updateLesson = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lessons').update({
        title: title.trim(),
        youtube_url: youtubeUrl.trim() || null,
        description: description.trim() || null,
        external_links: links,
      } as any).eq('id', lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessons', lesson.module_id] });
      qc.invalidateQueries({ queryKey: ['lesson', lesson.id] });
      toast({ title: 'Aula atualizada!' });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const addLink = () => {
    if (newLink.trim()) {
      setLinks(prev => [...prev, newLink.trim()]);
      setNewLink('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} title="Editar aula">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Editar Aula</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); updateLesson.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Link do YouTube</Label>
            <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da aula..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Links Externos</Label>
            <div className="flex gap-2">
              <Input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." className="flex-1" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); }}} />
              <Button type="button" variant="outline" size="icon" onClick={addLink}><Plus className="h-4 w-4" /></Button>
            </div>
            {links.length > 0 && (
              <div className="space-y-1 mt-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                    <span className="truncate flex-1">{link}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={updateLesson.isPending}>
            {updateLesson.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
