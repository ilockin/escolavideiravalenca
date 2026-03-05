import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface ParsedStudent {
  name: string;
  email: string;
  whatsapp: string;
  valid: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CsvImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<ParsedStudent[]>([]);
  const [courseId, setCourseId] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').order('title');
      return data ?? [];
    },
  });

  const reset = () => {
    setStudents([]);
    setCourseId('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed: ParsedStudent[] = res.data.map((row: Record<string, string>) => {
          const name = (row['nome'] || row['name'] || row['Nome'] || '').trim();
          const email = (row['email'] || row['Email'] || row['e-mail'] || '').trim();
          const whatsapp = (row['whatsapp'] || row['telefone'] || row['WhatsApp'] || row['Telefone'] || '').trim();

          if (!name || !email) {
            return { name, email, whatsapp, valid: false, error: 'Nome ou email ausente' };
          }
          if (!EMAIL_RE.test(email)) {
            return { name, email, whatsapp, valid: false, error: 'Email inválido' };
          }
          if (name.length > 200 || email.length > 255) {
            return { name, email, whatsapp, valid: false, error: 'Campo muito longo' };
          }
          return { name, email, whatsapp, valid: true };
        });
        setStudents(parsed);
        setResult(null);
      },
    });
  };

  const handleImport = async () => {
    if (!courseId) {
      toast({ title: 'Selecione um curso', variant: 'destructive' });
      return;
    }
    const valid = students.filter((s) => s.valid);
    if (valid.length === 0) {
      toast({ title: 'Nenhum aluno válido para importar', variant: 'destructive' });
      return;
    }

    setImporting(true);
    const rows = valid.map((s) => ({
      student_name: s.name,
      student_email: s.email,
      student_whatsapp: s.whatsapp || null,
      course_id: courseId,
      status: 'pendente',
    }));

    // Insert in batches of 50
    let inserted = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from('enrollments').insert(batch);
      if (error) {
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    setResult({ inserted, errors });
    setImporting(false);
    if (inserted > 0) {
      onSuccess();
      toast({ title: `${inserted} aluno(s) importado(s) com sucesso!` });
    }
  };

  const validCount = students.filter((s) => s.valid).length;
  const invalidCount = students.filter((s) => !s.valid).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Alunos via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Curso</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Arquivo CSV</Label>
            <p className="text-xs text-muted-foreground">
              Colunas esperadas: <strong>nome</strong>, <strong>email</strong>, <strong>whatsapp</strong> (opcional)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {students.length > 0 && (
            <>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {validCount} válidos
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" /> {invalidCount} com erro
                  </span>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.slice(0, 100).map((s, i) => (
                      <TableRow key={i} className={!s.valid ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-sm">{s.name || '—'}</TableCell>
                        <TableCell className="text-sm">{s.email || '—'}</TableCell>
                        <TableCell className="text-sm">{s.whatsapp || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {s.valid ? (
                            <span className="text-green-600">OK</span>
                          ) : (
                            <span className="text-destructive">{s.error}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result && (
                <p className="text-sm font-medium">
                  Resultado: {result.inserted} importado(s){result.errors > 0 && `, ${result.errors} erro(s)`}
                </p>
              )}

              {!result && (
                <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full">
                  {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar {validCount} aluno(s)
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
