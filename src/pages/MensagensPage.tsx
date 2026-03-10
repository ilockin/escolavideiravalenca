import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, MessageSquare, Send, ChevronLeft, Search, Loader2, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConversationThread {
  id: string;
  content: string;
  lesson_id: string;
  user_id: string;
  created_at: string | null;
  lessonTitle?: string;
  studentName?: string;
  replyCount: number;
  lastReplyAt: string | null;
}

export default function MensagensPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const isStaff = role === 'editor' || role === 'professor';

  // Fetch private comments (threads) based on role
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['message-threads', role],
    queryFn: async () => {
      let query = supabase
        .from('comments')
        .select('*')
        .eq('is_private', true)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (!isStaff) {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const comments = data ?? [];
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const lessonIds = [...new Set(comments.map(c => c.lesson_id))];

      const [profilesRes, lessonsRes, repliesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds.length ? userIds : ['none']),
        supabase.from('lessons').select('id, title').in('id', lessonIds.length ? lessonIds : ['none']),
        supabase.from('comments').select('id, parent_id, created_at').eq('is_private', true).in('parent_id', comments.map(c => c.id).length ? comments.map(c => c.id) : ['none']),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.full_name ?? 'Sem nome']) ?? []);
      const lessonMap = new Map(lessonsRes.data?.map(l => [l.id, l.title]) ?? []);
      const replyMap = new Map<string, { count: number; lastAt: string | null }>();
      
      repliesRes.data?.forEach(r => {
        if (!r.parent_id) return;
        const existing = replyMap.get(r.parent_id);
        if (!existing) {
          replyMap.set(r.parent_id, { count: 1, lastAt: r.created_at });
        } else {
          existing.count++;
          if (r.created_at && (!existing.lastAt || r.created_at > existing.lastAt)) {
            existing.lastAt = r.created_at;
          }
        }
      });

      // If staff, filter to students from their turmas
      let filteredComments = comments;
      if (isStaff) {
        const { data: turmaStudents } = await supabase
          .from('turma_students')
          .select('user_id');
        const studentIds = new Set(turmaStudents?.map(ts => ts.user_id) ?? []);
        filteredComments = comments.filter(c => studentIds.has(c.user_id));
      }

      return filteredComments.map(c => ({
        id: c.id,
        content: c.content,
        lesson_id: c.lesson_id,
        user_id: c.user_id,
        created_at: c.created_at,
        lessonTitle: lessonMap.get(c.lesson_id) ?? 'Aula',
        studentName: profileMap.get(c.user_id) ?? 'Sem nome',
        replyCount: replyMap.get(c.id)?.count ?? 0,
        lastReplyAt: replyMap.get(c.id)?.lastAt ?? null,
      })) as ConversationThread[];
    },
  });

  // Fetch replies for selected thread
  const { data: replies = [], isLoading: loadingReplies } = useQuery({
    queryKey: ['thread-replies', selectedThread],
    enabled: !!selectedThread,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_id', selectedThread!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds.length ? userIds : ['none']);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name ?? 'Sem nome']) ?? []);
      return (data ?? []).map(c => ({ ...c, authorName: profileMap.get(c.user_id) ?? 'Sem nome' }));
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedThread || !replyContent.trim()) return;
      const thread = threads.find(t => t.id === selectedThread);
      if (!thread) return;

      const { error } = await supabase.from('comments').insert({
        lesson_id: thread.lesson_id,
        user_id: user!.id,
        content: replyContent.trim(),
        is_private: true,
        parent_id: selectedThread,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyContent('');
      qc.invalidateQueries({ queryKey: ['thread-replies', selectedThread] });
      qc.invalidateQueries({ queryKey: ['message-threads'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    },
  });

  const currentThread = threads.find(t => t.id === selectedThread);

  const filtered = threads.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.studentName?.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || t.lessonTitle?.toLowerCase().includes(q);
  });

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  // Thread detail view
  if (selectedThread && currentThread) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">Conversa com {isStaff ? currentThread.studentName : 'Professor'}</h2>
            <p className="text-xs text-muted-foreground">Aula: {currentThread.lessonTitle}</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-4 space-y-4">
                {/* Original message */}
                <div className={`flex ${currentThread.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${currentThread.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-xs font-medium mb-1 opacity-70">{currentThread.studentName}</p>
                    <p className="text-sm whitespace-pre-wrap">{currentThread.content}</p>
                    <p className="text-[10px] mt-1 opacity-60">{formatDate(currentThread.created_at)}</p>
                  </div>
                </div>

                {loadingReplies ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  replies.map(r => (
                    <div key={r.id} className={`flex ${r.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${r.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-xs font-medium mb-1 opacity-70">{(r as any).authorName}</p>
                        <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                        <p className="text-[10px] mt-1 opacity-60">{formatDate(r.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Reply input */}
            <div className="border-t p-3 flex gap-2">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                className="min-h-[50px] text-sm flex-1"
                maxLength={1000}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply.mutate(); } }}
              />
              <Button size="icon" disabled={!replyContent.trim() || sendReply.isPending} onClick={() => sendReply.mutate()}>
                {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Thread list view
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {isStaff ? <Inbox className="h-6 w-6 text-primary" /> : <MessageSquare className="h-6 w-6 text-primary" />}
          {isStaff ? 'Caixa de Entrada' : 'Minhas Conversas'}
        </h1>
        <p className="text-muted-foreground">
          {isStaff ? 'Mensagens privadas dos alunos das suas turmas' : 'Histórico de suas mensagens privadas e respostas'}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversas..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
            {!isStaff && <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem privada em qualquer aula para iniciar uma conversa</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <Card key={t.id} className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedThread(t.id)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{isStaff ? t.studentName : 'Você'}</span>
                      <span className="text-xs text-muted-foreground">• {t.lessonTitle}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.content}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(t.lastReplyAt ?? t.created_at)}
                    </span>
                    {t.replyCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{t.replyCount} {t.replyCount === 1 ? 'resposta' : 'respostas'}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
