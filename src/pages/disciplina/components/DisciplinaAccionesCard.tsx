import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  AtSign,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Columns3,
  LayoutDashboard,
  Loader2,
  PenLine,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useAcciones } from '@/features/operations'
import { accionComentariosService } from '@/services/accionComentarios.service'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { AccionComentario } from '@/types/accionComentario'

import { accionEstadoLabel } from '@/features/operations/utils/accionEstadoDisplay'

function accionExecMetrics(list: AccionDiaria[]) {
  let enCurso = 0
  let cerradas = 0
  let bloqueadas = 0
  for (const a of list) {
    const done = a.estado === 'Completada'
    if (a.estado === 'En_Pausa') bloqueadas++
    if (!done) enCurso++
    else cerradas++
  }
  return { total: list.length, enCurso, cerradas, bloqueadas }
}

function sortForDisplay(list: AccionDiaria[]) {
  const pendientePrimero = (e: ActionStatus) => (e === 'Completada' ? 1 : 0)
  return [...list].sort(
    (a, b) => pendientePrimero(a.estado) - pendientePrimero(b.estado) || a.titulo_accion.localeCompare(b.titulo_accion)
  )
}

function isTaggedInComment(comment: AccionComentario, userId: string): boolean {
  return comment.asignado === userId || comment.etiquetas?.includes(userId)
}

function uniqueById(list: AccionDiaria[]): AccionDiaria[] {
  return [...new Map(list.map((accion) => [accion.id, accion])).values()]
}

function estadoBadgeClasses(estado: ActionStatus) {
  if (estado === 'Completada') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
  }
  if (estado === 'Retrasa') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100'
  }
  if (estado === 'En_Proceso') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-950 dark:text-blue-100'
  }
  return 'border-border/60 bg-muted/50 text-foreground'
}

const VISIBLES_CATEGORIAS_INFO = [
  { titulo: 'Creaste', texto: 'Acciones que generaste en esta fecha.' },
  { titulo: 'Te asignaron', texto: 'Asignadas por otro usuario; sigues siendo responsable.' },
  { titulo: 'Te etiquetaron', texto: 'Acciones donde te involucraron desde comentarios.' },
] as const

function TusAccionesVisiblesInfoHint() {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Qué significan Creaste, Te asignaron y Te etiquetaron"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-sm px-3 py-2.5 text-left">
          <ul className="space-y-2">
            {VISIBLES_CATEGORIAS_INFO.map(({ titulo, texto }) => (
              <li key={titulo} className="leading-snug">
                <span className="font-semibold text-popover-foreground">{titulo}:</span>{' '}
                <span className="text-popover-foreground/90">{texto}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function KpiChip({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'amber' | 'emerald' | 'red'
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center rounded-lg border px-2 py-2 sm:px-3 sm:py-2.5',
        tone === 'default' && 'border-border/60 bg-background/80',
        tone === 'amber' && 'border-amber-500/25 bg-amber-500/[0.07]',
        tone === 'emerald' && 'border-emerald-500/25 bg-emerald-500/[0.07]',
        tone === 'red' && 'border-red-500/30 bg-red-500/[0.08]'
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums leading-none tracking-tight sm:text-2xl',
          tone === 'amber' && 'text-amber-950 dark:text-amber-50',
          tone === 'emerald' && 'text-emerald-950 dark:text-emerald-50',
          tone === 'red' && 'text-red-900 dark:text-red-100',
          tone === 'default' && 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function AccionEnlaceRow({ accion, fechaRef }: { accion: AccionDiaria; fechaRef: string }) {
  const done = accion.estado === 'Completada'
  const riesgoEvidencia = done && !accion.evidencia_cargada
  const to = `${ROUTES.KANBAN}?accion=${encodeURIComponent(accion.id)}&fecha=${encodeURIComponent(fechaRef)}`

  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5',
        'transition-colors hover:border-primary/25 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        riesgoEvidencia && 'border-amber-500/35 bg-amber-500/[0.06]'
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {accion.titulo_accion}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold',
              estadoBadgeClasses(accion.estado)
            )}
          >
            {accionEstadoLabel(accion.estado)}
          </span>
          {accion.hora_limite ? (
            <span className="text-[10px] tabular-nums text-muted-foreground">Límite {accion.hora_limite}</span>
          ) : null}
          {riesgoEvidencia ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              Sin evidencia
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  )
}

function GrupoMetricPills({ metrics }: { metrics: ReturnType<typeof accionExecMetrics> }) {
  if (metrics.total === 0) {
    return <span className="text-xs text-muted-foreground">Sin acciones</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {metrics.enCurso > 0 ? (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100">
          {metrics.enCurso} en curso
        </span>
      ) : null}
      {metrics.cerradas > 0 ? (
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:text-emerald-100">
          {metrics.cerradas} cerrada{metrics.cerradas !== 1 ? 's' : ''}
        </span>
      ) : null}
      {metrics.bloqueadas > 0 ? (
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-950 dark:text-red-100">
          {metrics.bloqueadas} bloqueada{metrics.bloqueadas !== 1 ? 's' : ''}
        </span>
      ) : null}
    </div>
  )
}

function GrupoAccionesLista({
  titulo,
  icon: Icon,
  items,
  fechaRef,
  metrics,
  defaultOpen = false,
}: {
  titulo: string
  icon: typeof PenLine
  items: AccionDiaria[]
  fechaRef: string
  metrics: ReturnType<typeof accionExecMetrics>
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const sorted = useMemo(() => sortForDisplay(items), [items])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-background transition-colors',
        open ? 'border-border/70 shadow-sm' : 'border-border/50'
      )}
    >
      <button
        type="button"
        className="flex w-full min-h-11 items-center gap-2.5 px-2.5 py-2.5 text-left touch-manipulation transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-3 sm:px-3 sm:py-3"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-primary sm:h-9 sm:w-9">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">{titulo}</h4>
            <span
              className={cn(
                'inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                metrics.total > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {metrics.total}
            </span>
          </div>
          <div className="mt-1">
            <GrupoMetricPills metrics={metrics} />
          </div>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-border/50 bg-muted/10 px-3 pb-3 pt-2 sm:px-4">
          {sorted.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">Nada en esta categoría para la fecha elegida.</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto" aria-label={titulo}>
              {sorted.map((a) => (
                <li key={a.id}>
                  <AccionEnlaceRow accion={a} fechaRef={fechaRef} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

interface DisciplinaAccionesCardProps {
  fecha: string
  usuarioId: string | undefined
  embedded?: boolean
}

export function DisciplinaAccionesCard({ fecha, usuarioId, embedded = false }: DisciplinaAccionesCardProps) {
  const today = todayWallClockCDMX()
  const { data: acciones = [], isLoading, isError } = useAcciones(
    { fecha_creacion: fecha },
    { enabled: !!usuarioId }
  )
  const actionIds = useMemo(() => acciones.map((accion) => accion.id), [acciones])
  const {
    data: comentarios = [],
    isLoading: loadingComments,
    isError: commentsError,
  } = useQuery({
    queryKey: ['disciplina', 'acciones-dia', 'comentarios', usuarioId ?? '', actionIds],
    queryFn: () => accionComentariosService.listByAccionIds(actionIds),
    enabled: Boolean(usuarioId && actionIds.length > 0),
    staleTime: 30_000,
    retry: 1,
  })

  const { accionesUsuario, creadasPorMi, asignadasComoResponsable, etiquetadasEnComentarios } = useMemo(() => {
    if (!usuarioId) {
      return {
        accionesUsuario: [] as AccionDiaria[],
        creadasPorMi: [] as AccionDiaria[],
        asignadasComoResponsable: [] as AccionDiaria[],
        etiquetadasEnComentarios: [] as AccionDiaria[],
      }
    }
    const taggedActionIds = new Set(
      comentarios
        .filter((comment) => isTaggedInComment(comment, usuarioId))
        .map((comment) => comment.accion_id)
    )
    const creadas = acciones.filter((accion) => accion.created_by === usuarioId)
    const asignadas = acciones.filter((accion) => accion.responsable === usuarioId)
    const etiquetadas = acciones.filter((accion) => taggedActionIds.has(accion.id))
    return {
      accionesUsuario: uniqueById([...creadas, ...asignadas, ...etiquetadas]),
      creadasPorMi: creadas,
      asignadasComoResponsable: asignadas.filter((accion) => accion.created_by !== usuarioId),
      etiquetadasEnComentarios: etiquetadas.filter(
        (accion) => accion.created_by !== usuarioId && accion.responsable !== usuarioId
      ),
    }
  }, [acciones, comentarios, usuarioId])

  const exec = useMemo(() => accionExecMetrics(accionesUsuario), [accionesUsuario])
  const mCreadas = useMemo(() => accionExecMetrics(creadasPorMi), [creadasPorMi])
  const mAsignadas = useMemo(() => accionExecMetrics(asignadasComoResponsable), [asignadasComoResponsable])
  const mEtiquetadas = useMemo(() => accionExecMetrics(etiquetadasEnComentarios), [etiquetadasEnComentarios])

  const fechaLabel =
    fecha === today
      ? 'Hoy'
      : new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', dateStyle: 'long' })

  if (!usuarioId) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
        Inicia sesión para ver tus acciones del día.
      </div>
    )
  }

  return (
    <div
      id="disciplina-acciones-card"
      className={cn(
        'disciplina-acciones-card flex h-full flex-col',
        embedded
          ? 'gap-3'
          : 'overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm'
      )}
    >
      {!embedded ? (
        <div className="border-b border-border/50 bg-muted/20 px-3 py-3 sm:px-4 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Ejecución
            </p>
            <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Acciones del día
            </h3>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground sm:text-sm">{fechaLabel}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-9 w-full rounded-lg px-2 text-xs sm:text-sm" asChild>
              <Link to={ROUTES.DASHBOARD}>
                <LayoutDashboard className="mr-1 h-3.5 w-3.5 shrink-0" />
                Tablero
              </Link>
            </Button>
            <Button size="sm" className="h-9 w-full rounded-lg px-2 text-xs shadow-sm sm:text-sm" asChild>
              <Link to={`${ROUTES.KANBAN}?fecha=${encodeURIComponent(fecha)}`}>
                <Columns3 className="mr-1 h-3.5 w-3.5 shrink-0" />
                Kanban
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs capitalize text-muted-foreground">{fechaLabel}</p>
      )}

      <div className={cn('flex flex-1 flex-col gap-3', !embedded && 'p-3 sm:gap-4 sm:p-4')}>
        {isError ? (
          <p className="text-sm text-destructive">No se pudieron cargar las acciones.</p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden />
            Cargando acciones…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
                <KpiChip label="Total" value={exec.total} />
                <KpiChip label="En curso" value={exec.enCurso} tone="amber" />
                <KpiChip label="Cerradas" value={exec.cerradas} tone="emerald" />
                <KpiChip
                  label="Bloqueadas"
                  value={exec.bloqueadas}
                  tone={exec.bloqueadas > 0 ? 'red' : 'default'}
                />
              </div>
            </div>

            {exec.bloqueadas > 0 ? (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-xs text-red-950 dark:text-red-100 sm:px-3 sm:py-2.5 sm:text-sm"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                <p>
                  <span className="font-semibold">
                    {exec.bloqueadas} bloqueada{exec.bloqueadas !== 1 ? 's' : ''}
                  </span>
                  <span className="hidden sm:inline"> — revisa el impedimento en el Kanban.</span>
                </p>
              </div>
            ) : null}

            <div className="flex flex-1 flex-col rounded-lg border border-border/50 bg-muted/15 p-2 sm:rounded-xl sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1">
                  <h4 className="truncate text-sm font-semibold text-foreground">Tus acciones</h4>
                  <TusAccionesVisiblesInfoHint />
                </div>
                <p className="hidden shrink-0 text-[10px] text-muted-foreground min-[400px]:inline sm:text-xs">
                  Toca para abrir
                </p>
              </div>

              {loadingComments ? (
                <p className="mt-2 text-xs text-muted-foreground">Cargando etiquetas…</p>
              ) : commentsError ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  No se cargaron etiquetas; se muestran creadas y asignadas.
                </p>
              ) : null}

              {exec.total === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-background/60 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">Sin acciones visibles para hoy</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cuando crees, te asignen o te etiqueten acciones, aparecerán aquí.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-lg" asChild>
                    <Link to={`${ROUTES.KANBAN}?fecha=${encodeURIComponent(fecha)}`}>Abrir Kanban</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <GrupoAccionesLista
                    titulo="Creaste"
                    icon={PenLine}
                    items={creadasPorMi}
                    fechaRef={fecha}
                    metrics={mCreadas}
                  />
                  <GrupoAccionesLista
                    titulo="Te asignaron"
                    icon={UserPlus}
                    items={asignadasComoResponsable}
                    fechaRef={fecha}
                    metrics={mAsignadas}
                  />
                  <GrupoAccionesLista
                    titulo="Te etiquetaron"
                    icon={AtSign}
                    items={etiquetadasEnComentarios}
                    fechaRef={fecha}
                    metrics={mEtiquetadas}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
