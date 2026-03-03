import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AlunosPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos matriculados</p>
        </div>
      </div>

      <Tabs defaultValue="aprovados" className="w-full">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
          <TabsTrigger value="reprovados">Reprovados</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." className="pl-9" />
          </div>
        </div>

        <TabsContent value="pendentes" className="mt-4">
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum cadastro pendente</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovados" className="mt-4">
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum aluno aprovado</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reprovados" className="mt-4">
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum aluno reprovado</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
