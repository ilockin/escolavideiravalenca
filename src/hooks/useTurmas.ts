import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Turma {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  user_id: string;
  full_name: string | null;
  whatsapp: string | null;
  email?: string;
}

export function useTurmas() {
  return useQuery({
    queryKey: ['turmas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Turma[];
    },
  });
}

export function useTurmaCourses(turmaId: string | undefined) {
  return useQuery({
    queryKey: ['turma-courses', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('turma_courses')
        .select('*, courses(id, title)')
        .eq('turma_id', turmaId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useTurmaStudents(turmaId: string | undefined) {
  return useQuery({
    queryKey: ['turma-students', turmaId],
    enabled: !!turmaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('turma_students')
        .select('*, profiles:user_id(user_id, full_name)')
        .eq('turma_id', turmaId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTurma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (turma: { name: string; description?: string | null; created_by?: string | null }) => {
      const { data, error } = await supabase.from('turmas').insert(turma).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      toast({ title: 'Turma criada com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar turma', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTurma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('turmas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      toast({ title: 'Turma excluída!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir turma', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAddCourseToTurma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ turma_id, course_id }: { turma_id: string; course_id: string }) => {
      const { error } = await supabase.from('turma_courses').insert({ turma_id, course_id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['turma-courses', vars.turma_id] });
      toast({ title: 'Curso associado à turma!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao associar curso', description: err.message, variant: 'destructive' });
    },
  });
}

export function useRemoveCourseFromTurma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ turma_id, course_id }: { turma_id: string; course_id: string }) => {
      const { error } = await supabase.from('turma_courses').delete().eq('turma_id', turma_id).eq('course_id', course_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['turma-courses', vars.turma_id] });
      toast({ title: 'Curso removido da turma!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAddStudentToTurma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ turma_id, user_id }: { turma_id: string; user_id: string }) => {
      const { error } = await supabase.from('turma_students').insert({ turma_id, user_id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['turma-students', vars.turma_id] });
      toast({ title: 'Aluno adicionado à turma!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao adicionar aluno', description: err.message, variant: 'destructive' });
    },
  });
}

export function useRemoveStudentFromTurma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ turma_id, user_id }: { turma_id: string; user_id: string }) => {
      const { error } = await supabase.from('turma_students').delete().eq('turma_id', turma_id).eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['turma-students', vars.turma_id] });
      toast({ title: 'Aluno removido da turma!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAllStudents() {
  return useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'aluno');
      if (error) throw error;
      if (!roles.length) return [] as StudentProfile[];

      const studentIds = roles.map(r => r.user_id);

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, whatsapp')
        .in('user_id', studentIds);
      if (pErr) throw pErr;

      // Get emails from enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id, student_email')
        .in('user_id', studentIds);

      const emailMap = new Map<string, string>();
      enrollments?.forEach(e => {
        if (e.user_id) emailMap.set(e.user_id, e.student_email);
      });

      return (profiles ?? []).map(p => ({
        ...p,
        email: emailMap.get(p.user_id) || '',
      })) as StudentProfile[];
    },
  });
}
