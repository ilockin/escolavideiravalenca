import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MIN_ATTENDANCE_SECONDS = 300;
const SAVE_INTERVAL_MS = 30_000; // save every 30s

export function useLessonTimer(lessonId: string | undefined, userId: string | undefined) {
  const startTime = useRef<number>(Date.now());
  const accumulated = useRef<number>(0);

  useEffect(() => {
    if (!lessonId || !userId) return;

    startTime.current = Date.now();
    accumulated.current = 0;

    const save = async () => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      const totalSeconds = accumulated.current + elapsed;
      if (totalSeconds < 5) return; // don't save trivial visits

      try {
        const today = new Date().toISOString().split('T')[0];
        // Upsert: add duration to existing record for today
        const { data: existing } = await supabase
          .from('lesson_analytics')
          .select('id, duration_seconds')
          .eq('student_id', userId)
          .eq('lesson_id', lessonId)
          .eq('date', today)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('lesson_analytics')
            .update({ duration_seconds: existing.duration_seconds + totalSeconds })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('lesson_analytics')
            .insert({
              student_id: userId,
              lesson_id: lessonId,
              date: today,
              duration_seconds: totalSeconds,
            });
        }

        accumulated.current = 0;
        startTime.current = Date.now();
      } catch {
        // silently ignore
      }
    };

    const interval = setInterval(save, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      // Save on unmount
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      accumulated.current += elapsed;
      save();
    };
  }, [lessonId, userId]);
}

export { MIN_ATTENDANCE_SECONDS };
