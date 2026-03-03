import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CursosPage() {
  const { role } = useAuth();
  const canCreate = role === 'editor';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cursos</h1>
          <p className="text-muted-foreground">Gerencie os cursos da escola</p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Curso
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Empty state */}
        <Card className="glass-card border-dashed flex items-center justify-center min-h-[200px] col-span-full">
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum curso cadastrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {canCreate ? 'Crie seu primeiro curso para começar' : 'Aguarde até que cursos sejam cadastrados'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
