import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MessageSquare, Lock, Reply, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  is_private: boolean | null;
  parent_id: string | null;
  user_id: string;
  created_at: string | null;
  lesson_id: string;
  profile?: { full_name: string | null } | null;
}

export function LessonComments({ lessonId }: { lessonId: string }) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const isStaff = role === 'editor' || role === 'professor';

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Fetch profiles for comment authors
      const userIds = [...new Set((data ?? []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
      return (data ?? []).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) ?? null,
      })) as Comment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ text, parentId, priv }: { text: string; parentId?: string | null; priv: boolean }) => {
      const { error } = await supabase.from('comments').insert({
        lesson_id: lessonId,
        user_id: user!.id,
        content: text.trim(),
        is_private: priv,
        parent_id: parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', lessonId] });
      setContent('');
      setIsPrivate(false);
      setReplyTo(null);
      setReplyContent('');
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao enviar comentário', description: err.message, variant: 'destructive' });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', lessonId] });
      toast({ title: 'Comentário removido' });
    },
  });

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const CommentBubble = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isOwn = comment.user_id === user?.id;
    const canDelete = isOwn || isStaff;
    const childReplies = replies(comment.id);

    return (
      <div className={depth > 0 ? 'ml-6 border-l-2 border-border/50 pl-4' : ''}>
        <div className="py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{comment.profile?.full_name || 'Anônimo'}</span>
                {comment.is_private && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    <Lock className="h-3 w-3" /> Privado
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {comment.created_at ? new Date(comment.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {depth === 0 && (
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                  <Reply className="h-3.5 w-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => deleteComment.mutate(comment.id)}
                  disabled={deleteComment.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Inline reply form */}
          {replyTo === comment.id && (
            <div className="mt-2 flex gap-2">
              <Textarea
                placeholder="Responder..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[60px] text-sm"
                maxLength={1000}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  disabled={!replyContent.trim() || addComment.isPending}
                  onClick={() => addComment.mutate({ text: replyContent, parentId: comment.id, priv: comment.is_private ?? false })}
                >
                  {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enviar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyContent(''); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {childReplies.map((r) => (
          <CommentBubble key={r.id} comment={r} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comentários
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* New comment form */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escreva um comentário ou pergunta..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="private-toggle" checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label htmlFor="private-toggle" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                <Lock className="h-3 w-3" /> Pergunta privada (só professor vê)
              </Label>
            </div>
            <Button
              size="sm"
              disabled={!content.trim() || addComment.isPending}
              onClick={() => addComment.mutate({ text: content, parentId: null, priv: isPrivate })}
            >
              {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Enviar
            </Button>
          </div>
        </div>

        {/* Comments list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
        ) : (
          <div className="divide-y divide-border/50">
            {topLevel.map((c) => (
              <CommentBubble key={c.id} comment={c} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
