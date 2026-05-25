import { useState } from 'react'
import { Activity, CalendarDays, ChevronDown, Target, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { accionStoryPoints, isAccionEstadoDone } from '@/features/kpi/utils/gapProgress'
import { useAcciones } from '../hooks/useAcciones'
import { useSprintActivo } from '../hooks/useSprint'

function progressTone(pct: number) {
  if (pct >= 85) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-primary'
}

export function KanbanSprintSummary() {
  const [open, setOpen] = useState(false)
  const { data: sprint, isLoading } = useSprintActivo()
  const { data: acciones = [] } = useAcciones({}, { enabled: !!sprint })

  const sprintActions = sprint
    ? acciones.filter((action) => action.sprint_id === sprint.id && action.tipo_accion !== 'operativa')
    : []
  const totalPoints = sprintActions.reduce((sum, action) => sum + accionStoryPoints(action), 0)
  const donePoints = sprintActions
    .filter((action) => isAccionEstadoDone(action.estado))
    .reduce((sum, action) => sum + accionStoryPoints(action), 0)
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/25 sm:flex-row sm:items-center sm:justify-between"
        aria-expanded={open}
        aria-controls="kanban-action-types"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tipos de acciones
            </p>
            <h2 className="text-base font-semibold text-foreground">RUN vs SPRINT</h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              Clasifica si el trabajo mantiene la operacion o impulsa transformacion temporal.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {sprint ? (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Sprint activo
            </Badge>
          ) : null}
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
      <div id="kanban-action-types" className="grid gap-0 border-t border-border/70 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <Badge variant="outline" className="mb-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-700">
                RUN
              </Badge>
              <p className="text-sm font-medium text-foreground">La operacion continua del negocio.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tareas diarias, recurrentes o necesarias para que el negocio siga funcionando. No requieren sprint.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <Badge variant="outline" className="mb-2 border-primary/40 bg-primary/10 text-primary">
                SPRINT
              </Badge>
              <p className="text-sm font-medium text-foreground">
                Los esfuerzos temporales de transformacion y mejora.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Trabajo CHANGE con objetivo, fechas y avance medido por acciones o puntos vinculados.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-3 text-sm leading-relaxed text-muted-foreground">
            <p>El tablero separa claramente dos tipos de ejecucion:</p>
            <p className="mt-2">
              <span className="font-semibold text-foreground">RUN:</span> mantener la operacion funcionando.
            </p>
            <p>
              <span className="font-semibold text-foreground">SPRINT:</span> evolucionar estrategicamente la empresa.
            </p>
          </div>
        </div>

        <div className="border-t border-border/70 bg-muted/10 p-4 sm:p-5 lg:border-l lg:border-t-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando sprint activo...</p>
          ) : sprint ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                  <Zap className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground">{sprint.nombre}</h3>
                    <Badge variant="outline" className="capitalize">
                      {sprint.estado}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sprint.objetivo || sprint.descripcion || 'Sprint activo sin descripcion definida.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Avance" value={`${progressPct}%`} />
                <Metric label="Puntos" value={`${donePoints}/${totalPoints}`} />
                <Metric label="Acciones" value={String(sprintActions.length)} />
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={cn('h-full rounded-full transition-all', progressTone(progressPct))}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {sprint.fecha_inicio} - {sprint.fecha_fin}
                </span>
                {sprint.objetivo ? (
                  <span className="inline-flex items-center gap-1">
                    <Target className="size-3.5" aria-hidden />
                    Objetivo definido
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-40 flex-col justify-center rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay sprint activo. Cuando exista uno, aqui veras su objetivo, fechas y avance sin abrir controles de creacion.
            </div>
          )}
        </div>
      </div>
      ) : null}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-2 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}
