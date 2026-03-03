import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, Trophy, RotateCcw, Loader2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface QuizProps {
  lessonId: string;
  onPass: (score: number) => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: Json;
  correct_answer: number;
  position: number | null;
}

export function LessonQuiz({ lessonId, onPass }: QuizProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['quiz-questions', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as QuizQuestion[];
    },
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) return null;

  const totalQuestions = questions.length;
  const question = questions[currentQ];
  const options = Array.isArray(question.options) ? (question.options as string[]) : [];

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = questions.reduce((acc, q, i) => {
      return acc + (answers[i] === q.correct_answer ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / totalQuestions) * 100);
    if (score >= 60) {
      onPass(score);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQ(0);
    setSubmitted(false);
  };

  if (submitted) {
    const correctCount = questions.reduce((acc, q, i) => {
      return acc + (answers[i] === q.correct_answer ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 60;

    return (
      <Card className="glass-card">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            {passed ? (
              <Trophy className="h-14 w-14 text-primary mx-auto" />
            ) : (
              <AlertTriangle className="h-14 w-14 text-destructive mx-auto" />
            )}
            <div>
              <h3 className="text-xl font-bold">
                {passed ? 'Parabéns! Você passou!' : 'Não foi dessa vez...'}
              </h3>
              <p className="text-muted-foreground mt-1">
                Você acertou {correctCount} de {totalQuestions} ({score}%)
              </p>
              {!passed && (
                <p className="text-sm text-muted-foreground mt-1">
                  Mínimo necessário: 60%
                </p>
              )}
            </div>
            <Progress value={score} className="h-3 max-w-xs mx-auto" />

            {/* Review answers */}
            <div className="mt-6 space-y-3 text-left max-w-md mx-auto">
              {questions.map((q, i) => {
                const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
                const isCorrect = answers[i] === q.correct_answer;
                return (
                  <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{q.question}</p>
                        {!isCorrect && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Resposta correta: {opts[q.correct_answer] ?? '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!passed && (
              <Button onClick={handleRetry} className="mt-4">
                <RotateCcw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allAnswered = Object.keys(answers).length === totalQuestions;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Quiz — Pergunta {currentQ + 1} de {totalQuestions}
          </CardTitle>
          <span className="text-xs text-muted-foreground">Mínimo: 60%</span>
        </div>
        <Progress value={((currentQ + 1) / totalQuestions) * 100} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="font-medium">{question.question}</p>
        <RadioGroup
          value={answers[currentQ]?.toString()}
          onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQ]: parseInt(val) }))}
        >
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
              <RadioGroupItem value={i.toString()} id={`q${currentQ}-opt${i}`} />
              <Label htmlFor={`q${currentQ}-opt${i}`} className="flex-1 cursor-pointer text-sm">
                {String(opt)}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(prev => prev - 1)}
          >
            ← Anterior
          </Button>

          {currentQ < totalQuestions - 1 ? (
            <Button
              size="sm"
              disabled={answers[currentQ] === undefined}
              onClick={() => setCurrentQ(prev => prev + 1)}
            >
              Próxima →
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!allAnswered}
              onClick={handleSubmit}
            >
              Enviar Respostas
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
