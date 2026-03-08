import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Course = Tables<'courses'>;
export type Module = Tables<'modules'>;
export type Lesson = Tables<'lessons'>;

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['course', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Course;
    },
  });
}

export function useModules(courseId: string | undefined) {
  return useQuery({
    queryKey: ['modules', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
  });
}

export function useLessons(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', moduleId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
  });
}

export function useProfessors() {
  return useQuery({
    queryKey: ['professors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professor');
      if (error) throw error;
      
      if (!data.length) return [];
      
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', data.map(r => r.user_id));
      if (pErr) throw pErr;
      return profiles;
    },
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (course: TablesInsert<'courses'>) => {
      const { data, error } = await supabase.from('courses').insert(course).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: 'Curso criado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar curso', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<'courses'>>) => {
      const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course', data.id] });
      toast({ title: 'Curso atualizado!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: 'Curso excluído!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCreateModule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (mod: TablesInsert<'modules'>) => {
      const { data, error } = await supabase.from('modules').insert(mod).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['modules', data.course_id] });
      toast({ title: 'Módulo criado!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar módulo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, courseId, ...updates }: { id: string; courseId: string } & Partial<TablesInsert<'modules'>>) => {
      const { data, error } = await supabase.from('modules').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { ...data, courseId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['modules', data.courseId] });
      toast({ title: 'Módulo atualizado!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar módulo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ['modules', courseId] });
      toast({ title: 'Módulo excluído!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir módulo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lesson: TablesInsert<'lessons'>) => {
      const { data, error } = await supabase.from('lessons').insert(lesson).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lessons', data.module_id] });
      toast({ title: 'Aula criada!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar aula', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, moduleId }: { id: string; moduleId: string }) => {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      return moduleId;
    },
    onSuccess: (moduleId) => {
      qc.invalidateQueries({ queryKey: ['lessons', moduleId] });
      toast({ title: 'Aula excluída!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir aula', description: err.message, variant: 'destructive' });
    },
  });
}
