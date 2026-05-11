import { useState, useEffect } from 'react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useUpdateModule } from '@/hooks/useCourses';
import type { Module } from '@/hooks/useCourses';

export function ModuleSettingsDialog({ module }: { module: Module }) {
  const updateModule = useUpdateModule();
  const [open, setOpen] = useState(false);
  const [isReleased, setIsReleased] = useState(module.is_released ?? false);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(
    module.release_date ? new Date(module.release_date) : undefined
  );
  const [closeDate, setCloseDate] = useState<Date | undefined>(
    (module as any).close_date ? new Date((module as any).close_date) : undefined
  );

  useEffect(() => {
    if (open) {
      setIsReleased(module.is_released ?? false);
      setReleaseDate(module.release_date ? new Date(module.release_date) : undefined);
      setCloseDate((module as any).close_date ? new Date((module as any).close_date) : undefined);
    }
  }, [open, module]);

  const handleSave = async () => {
    const today = startOfDay(new Date());
    let finalIsReleased = isReleased;
    let finalReleaseType = releaseDate ? 'date' : 'manual';

    // If opening date is today or in the past, forcefully set as released (same as toggle ON)
    if (releaseDate && startOfDay(releaseDate) <= today) {
      finalIsReleased = true;
      finalReleaseType = 'manual'; // Exact same as toggle ON
    }

    // If closing date is today or in the past, forcefully set as not released (same as toggle OFF)
    if (closeDate && startOfDay(closeDate) <= today) {
      finalIsReleased = false;
      finalReleaseType = 'manual'; // Exact same as toggle OFF
    }

    await updateModule.mutateAsync({
      id: module.id,
      courseId: module.course_id,
      is_released: finalIsReleased,
      release_date: releaseDate ? releaseDate.toISOString() : null,
      release_type: finalReleaseType,
      close_date: closeDate ? closeDate.toISOString() : null,
    } as any);
    setOpen(false);
  };

  const statusLabel = (() => {
    const today = startOfDay(new Date());
    
    // Module is not released and no release date
    if (!isReleased && !releaseDate) return 'Fechado';
    
    // Module is released and no close date
    if (isReleased && !closeDate) return 'Aberto';
    
    // Has release date but not released yet
    if (releaseDate && !isReleased) {
      const releaseDay = startOfDay(releaseDate);
      if (today < releaseDay) return `Abre em ${format(releaseDate, "dd/MM/yyyy")}`;
      if (today >= releaseDay) return 'Aberto';
    }
    
    // Has close date
    if (closeDate) {
      const closeDay = startOfDay(closeDate);
      if (today > closeDay) return 'Fechado';
      if (today <= closeDay) return `Fecha em ${format(closeDate, "dd/MM/yyyy")}`;
    }
    
    return isReleased ? 'Aberto' : 'Fechado';
  })();

  const isLocked = (() => {
    const today = startOfDay(new Date());
    
    // If module is not released, it's locked
    if (!isReleased) return true;
    
    // If there's a release date, check if today is before release date
    if (releaseDate) {
      const releaseDay = startOfDay(releaseDate);
      if (today < releaseDay) return true;
    }
    
    // If there's a close date, check if today is after close date
    if (closeDate) {
      const closeDay = startOfDay(closeDate);
      if (today > closeDay) return true;
    }
    
    return false;
  })();

  const statusColor = !isLocked ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Configurar módulo" onClick={(e) => e.stopPropagation()}>
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Configurar Módulo</DialogTitle>
          <DialogDescription>
            Configure as datas de abertura e fechamento do módulo, e defina quando ele estará disponível para os alunos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Módulo aberto</Label>
              <p className="text-xs text-muted-foreground">
                Liberar acesso dos alunos imediatamente
              </p>
            </div>
            <Switch checked={isReleased} onCheckedChange={setIsReleased} />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Data de abertura (opcional)</Label>
            <p className="text-xs text-muted-foreground -mt-2">
              O módulo será aberto automaticamente nesta data
            </p>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !releaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {releaseDate ? format(releaseDate, "dd/MM/yyyy", { locale: ptBR }) : 'Sem data de abertura'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={releaseDate}
                    onSelect={setReleaseDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {releaseDate && (
                <Button variant="ghost" size="sm" onClick={() => setReleaseDate(undefined)} className="text-xs shrink-0">
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Data de fechamento (opcional)</Label>
            <p className="text-xs text-muted-foreground -mt-2">
              O módulo será fechado automaticamente nesta data
            </p>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !closeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {closeDate ? format(closeDate, "dd/MM/yyyy", { locale: ptBR }) : 'Sem data de fechamento'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={closeDate}
                    onSelect={setCloseDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {closeDate && (
                <Button variant="ghost" size="sm" onClick={() => setCloseDate(undefined)} className="text-xs shrink-0">
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Status atual: <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ml-1", statusColor)}>{statusLabel}</span>
            </p>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={updateModule.isPending}>
            {updateModule.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
