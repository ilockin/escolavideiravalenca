import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_answer: number;
  position: number;
}

export function QuizEditor({ lessonId }: { lessonId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('position');
      if (data) {
        setQuestions(
          data.map((q) => ({
            id: q.id,
            question: q.question,
            options: Array.isArray(q.options) ? (q.options as string[]) : [],
            correct_answer: q.correct_answer,
            position: q.position ?? 0,
          }))
        );
      }
      setLoading(false);
    })();
  }, [lessonId]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question: '', options: ['', ''], correct_answer: 0, position: prev.length },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i })));
  };

  const updateQuestion = (idx: number, field: string, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    );
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx && q.options.length < 6 ? { ...q, options: [...q.options, ''] } : q))
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx || q.options.length <= 2) return q;
        const newOpts = q.options.filter((_, j) => j !== oIdx);
        const newCorrect = q.correct_answer >= newOpts.length ? 0 : q.correct_answer > oIdx ? q.correct_answer - 1 : q.correct_answer === oIdx ? 0 : q.correct_answer;
        return { ...q, options: newOpts, correct_answer: newCorrect };
      })
    );
  };

  const setCorrect = (qIdx: number, oIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => (i === qIdx ? { ...q, correct_answer: oIdx } : q)));
  };

  const handleSave = async () => {
    // Validate
    for (const q of questions) {
      if (!q.question.trim()) {
        toast({ title: 'Preencha o enunciado de todas as perguntas', variant: 'destructive' });
        return;
      }
      if (q.options.some((o) => !o.trim())) {
        toast({ title: 'Preencha todas as alternativas', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      // Delete existing questions for this lesson
      await supabase.from('quiz_questions').delete().eq('lesson_id', lessonId);

      if (questions.length > 0) {
        const rows = questions.map((q, i) => ({
          lesson_id: lessonId,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()) as unknown as Json,
          correct_answer: q.correct_answer,
          position: i,
        }));
        const { error } = await supabase.from('quiz_questions').insert(rows);
        if (error) throw error;
      }

      // Update has_quiz flag on the lesson
      await supabase.from('lessons').update({ has_quiz: questions.length > 0 }).eq('id', lessonId);

      toast({ title: 'Quiz salvo com sucesso!' });
    } catch {
      toast({ title: 'Erro ao salvar quiz', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando quiz...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" /> Perguntas do Quiz
        </h4>
        <Button variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="h-3 w-3 mr-1" /> Pergunta
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma pergunta. Adicione perguntas para ativar o quiz.</p>
      )}

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Pergunta {qIdx + 1}</Label>
              <Input
                value={q.question}
                onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                placeholder="Digite a pergunta..."
                maxLength={500}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 mt-5" onClick={() => removeQuestion(qIdx)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <RadioGroup value={String(q.correct_answer)} onValueChange={(v) => setCorrect(qIdx, Number(v))}>
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <RadioGroupItem value={String(oIdx)} id={`q${qIdx}-o${oIdx}`} />
                <Input
                  className="flex-1 h-8 text-sm"
                  value={opt}
                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                  placeholder={`Alternativa ${oIdx + 1}`}
                  maxLength={300}
                />
                {q.options.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeOption(qIdx, oIdx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">Selecione o botão ao lado da alternativa correta.</p>
          {q.options.length < 6 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => addOption(qIdx)}>
              <Plus className="h-3 w-3 mr-1" /> Alternativa
            </Button>
          )}
        </div>
      ))}

      {questions.length > 0 && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Quiz
        </Button>
      )}
    </div>
  );
}
