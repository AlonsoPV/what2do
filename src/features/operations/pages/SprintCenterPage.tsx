import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { useKpis } from '@/features/catalogs/hooks/useKpis'
import { useGaps } from '@/features/kpi/hooks/useGaps'
import { accionStoryPoints, isAccionEstadoDone } from '@/features/kpi/utils/gapProgress'
import { useUsers } from '@/features/users/hooks/useUsers'
import { cn } from '@/lib/utils'
import type { AccionDiaria, Sprint } from '@/types'
import { Link } from 'react-router-dom'
import { useAcciones, useSprints } from '../hooks'
import { SprintPanel } from '../components/SprintPanel'

function sprintProgress(actions: AccionDiaria[]) {
  const totalPoints = actions.reduce((sum, action) => sum + accionStoryPoints(action), 0)
  const donePoints = actions
    .filter((action) => isAccionEstadoDone(action.estado))
    .reduce((sum, action) => sum + accionStoryPoints(action), 0)

  if (totalPoints > 0) {
    return {
      done: donePoints,
      total: totalPoints,
      pct: Math.round((donePoints / totalPoints) * 100),
      unit: 'pts',
    }
  }

  const doneActions = actions.filter((action) => isAccionEstadoDone(action.estado)).length
  return {
    done: doneActions,
    total: actions.length,
    pct: actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0,
    unit: 'acc.',
  }
}

function statusTone(status: Sprint['estado']) {
  if (status === 'activo') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (status === 'completado') return 'border-primary/40 bg-primary/10 text-primary'
  return 'border-muted-foreground/30 bg-muted text-muted-foreground'
}

export function SprintCenterPage() {
  const { data: sprints = [], isLoading: loadingSprints } = useSprints()
  const { data: acciones = [], isLoading: loadingActions } = useAcciones({
    tipo_accion: ['sprint', 'estrategica'],
  })
  const { data: users = [] } = useUsers({ activo: true })
  const { data: kpis = [] } = useKpis({ activo: true })
  const { data: gaps = [] } = useGaps({ filters: { activo: true } })

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user.nombre])), [users])
  const kpiById = useMemo(() => new Map(kpis.map((kpi) => [kpi.id, kpi.nombre])), [kpis])
  const gapById = useMemo(() => new Map(gaps.map((gap) => [gap.id, gap.nombre])), [gaps])
  const isLoading = loadingSprints || loadingActions
  const sprintSummaries = useMemo(
    () =>
      sprints
        .map((sprint) => {
          const sprintActions = acciones.filter((action) => action.sprint_id === sprint.id)
          return {
            sprint,
            actions: sprintActions,
            progress: sprintProgress(sprintActions),
            responsables: [
              ...new Set(sprintActions.map((action) => userById.get(action.responsable)).filter(Boolean)),
            ],
          }
        })
        .sort((a, b) => {
          if (a.sprint.estado === 'activo' && b.sprint.estado !== 'activo') return -1
          if (a.sprint.estado !== 'activo' && b.sprint.estado === 'activo') return 1
          return b.sprint.fecha_inicio.localeCompare(a.sprint.fecha_inicio)
        }),
    [acciones, sprints, userById]
  )
  const activeCount = sprintSummaries.filter((item) => item.sprint.estado === 'activo').length
  const totalActions = sprintSummaries.reduce((sum, item) => sum + item.actions.length, 0)
  const avgProgress =
    sprintSummaries.length > 0
      ? Math.round(sprintSummaries.reduce((sum, item) => sum + item.progress.pct, 0) / sprintSummaries.length)
      : 0

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            RUN vs CHANGE
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Sprint Center</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Gestiona los esfuerzos CHANGE con objetivo, fechas y compromiso. La operacion RUN se mantiene
            visible en Kanban, pero no contamina el avance de sprint.
          </p>
        </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={ROUTES.KANBAN}>Ir al Kanban</Link>
          </Button>
        </div>
        <div className="grid border-t border-border bg-muted/10 sm:grid-cols-3">
          <HeaderMetric label="Sprints activos" value={String(activeCount)} />
          <HeaderMetric label="Acciones CHANGE" value={String(totalActions)} />
          <HeaderMetric label="Avance promedio" value={`${avgProgress}%`} />
        </div>
      </header>

      <SprintPanel defaultOpen />

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Cargando sprints...
        </div>
      ) : sprints.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {sprintSummaries.map(({ sprint, actions: sprintActions, progress, responsables }) => {
            return (
              <section key={sprint.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="h-1 bg-primary" style={{ opacity: sprint.estado === 'activo' ? 1 : 0.35 }} />
                <div className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-foreground">{sprint.nombre}</h2>
                      <Badge variant="outline" className={cn('capitalize', statusTone(sprint.estado))}>
                        {sprint.estado}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {sprint.objetivo || 'Sin objetivo definido'}
                    </p>
                    {sprint.descripcion ? (
                      <p className="mt-1 text-sm text-muted-foreground">{sprint.descripcion}</p>
                    ) : null}
                  </div>
                  <div className="grid min-w-full grid-cols-3 gap-2 text-center sm:min-w-[15rem]">
                    <Metric label="Avance" value={`${progress.pct}%`} />
                    <Metric label="Completado" value={`${progress.done}/${progress.total}`} />
                    <Metric label="Unidad" value={progress.unit} />
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <InfoBlock label="Fechas" value={`${sprint.fecha_inicio} - ${sprint.fecha_fin}`} />
                  <InfoBlock label="KPI" value={sprint.kpi_id ? kpiById.get(sprint.kpi_id) ?? 'KPI vinculado' : 'Sin KPI'} />
                  <InfoBlock label="Gap" value={sprint.gap_id ? gapById.get(sprint.gap_id) ?? 'Gap vinculado' : 'Sin gap'} />
                  <InfoBlock
                    label="Responsables"
                    value={responsables.length > 0 ? responsables.join(', ') : 'Sin responsables'}
                  />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Acciones asociadas
                  </p>
                  {sprintActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin acciones CHANGE vinculadas.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {sprintActions.map((action) => (
                        <li key={action.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                          <Badge variant="outline" className="shrink-0">
                            {action.tipo_accion === 'sprint' ? 'Sprint' : 'Estrategica'}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate">
                            {action.titulo_accion || action.descripcion_accion}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {accionStoryPoints(action)} pts
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{action.estado}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
    </div>
  )
}
