import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronRight,
  Columns3,
  LayoutDashboard,
  Loader2,
  PenLine,
  Shield,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useAcciones } from '@/features/operations'
import { todayCDMX } from '@/lib/dateUtils'
import type { AccionDiaria, ActionStatus } from '@/types'

const ACCION_ESTADO_LABEL: Record<ActionStatus, string> = {
  Pendiente: 'Pendiente',
  Hoy: 'Hoy',
  En_Ejecucion: 'En ejecución',
  Bloqueado: 'Bloqueado',
  Retraso: 'Retraso',
  Hecho: 'Hecho',
  Verificado: 'Verificado',
}

function accionExecMetrics(list: AccionDiaria[]) {
  let enCurso = 0
  let cerradas = 0
  let riesgo = 0
  for (const a of list) {
    const done = a.estado === 'Hecho' || a.estado === 'Verificado'
    if (!done) enCurso++
    else {
      cerradas++
      if (!a.evidencia_cargada) riesgo++
    }
  }
  return { total: list.length, enCurso, cerradas, riesgo }
}

function grupoParentesis(g: { total: number; enCurso: number; cerradas: number }) {
  if (g.total === 0) return '(0)'
  const parts: string[] = []
  if (g.enCurso) parts.push(`${g.enCurso} en curso`)
  if (g.cerradas) parts.push(`${g.cerradas} cerrada${g.cerradas !== 1 ? 's' : ''}`)
  return parts.length ? `(${parts.join(', ')})` : '(0)'
}

function sortForDisplay(list: AccionDiaria[]) {
  const pendientePrimero = (e: ActionStatus) => (e === 'Hecho' || e === 'Verificado' ? 1 : 0)
  return [...list].sort(
    (a, b) => pendientePrimero(a.estado) - pendientePrimero(b.estado) || a.titulo_accion.localeCompare(b.titulo_accion)
  )
}

function estadoBadgeClasses(estado: ActionStatus) {
  if (estado === 'Hecho' || estado === 'Verificado') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
  }
  if (estado === 'Bloqueado' || estado === 'Retraso') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100'
  }
  if (estado === 'En_Ejecucion') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-950 dark:text-blue-100'
  }
  return 'border-border/60 bg-muted/50 text-foreground'
}

function AccionEnlaceRow({ accion, fechaRef }: { accion: AccionDiaria; fechaRef: string }) {
  const done = accion.estado === 'Hecho' || accion.estado === 'Verificado'
  const riesgoEvidencia = done && !accion.evidencia_cargada
  const to = `${ROUTES.KANBAN}?accion=${encodeURIComponent(accion.id)}&fecha=${encodeURIComponent(fechaRef)}`

  return (
    <Link
      to={to}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5',
        'transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        riesgoEvidencia && 'border-amber-500/35 bg-amber-500/[0.06]'
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {accion.titulo_accion}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
              estadoBadgeClasses(accion.estado)
            )}
          >
            {ACCION_ESTADO_LABEL[accion.estado]}
          </span>
          {accion.hora_limite ? (
            <span className="text-[11px] tabular-nums text-muted-foreground">Límite {accion.hora_limite}</span>
          ) : null}
          {riesgoEvidencia ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              Sin evidencia
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  )
}

function GrupoAccionesLista({
  titulo,
  descripcion,
  icon: Icon,
  items,
  fechaRef,
  metricsHint,
}: {
  titulo: string
  descripcion: string
  icon: typeof PenLine
  items: AccionDiaria[]
  fechaRef: string
  metricsHint: string
}) {
  const sorted = useMemo(() => sortForDisplay(items), [items])

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-border/45 bg-muted/20 p-4 dark:bg-muted/10">
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80 text-primary ring-1 ring-inset ring-border/50">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">{titulo}</h4>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
          <p className="text-[11px] text-muted-foreground">{metricsHint}</p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nada en esta categoría para la fecha elegida.</p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-0.5" aria-label={titulo}>
          {sorted.map((a) => (
            <li key={a.id}>
              <AccionEnlaceRow accion={a} fechaRef={fechaRef} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BigStat({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'default' | 'amber' | 'emerald' | 'risk'
  hint?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center rounded-2xl border px-4 py-5 text-center shadow-sm',
        tone === 'default' && 'border-border/60 bg-muted/40',
        tone === 'amber' && 'border-amber-500/25 bg-amber-500/[0.08]',
        tone === 'emerald' && 'border-emerald-500/25 bg-emerald-500/[0.08]',
        tone === 'risk' && 'border-amber-600/35 bg-amber-500/[0.12]'
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl',
          tone === 'amber' && 'text-amber-950 dark:text-amber-50',
          tone === 'emerald' && 'text-emerald-950 dark:text-emerald-50',
          tone === 'risk' && 'text-amber-900 dark:text-amber-100',
          tone === 'default' && 'text-foreground'
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

interface DisciplinaAccionesCardProps {
  fecha: string
  usuarioId: string | undefined
}

export function DisciplinaAccionesCard({ fecha, usuarioId }: DisciplinaAccionesCardProps) {
  const today = todayCDMX()
  const { data: acciones = [], isLoading, isError } = useAcciones(
    {
      fecha_creacion: fecha,
      responsable: usuarioId ?? '',
    },
    { enabled: !!usuarioId }
  )

  const { creadasPorMi, asignadasComoResponsable } = useMemo(() => {
    if (!usuarioId) {
      return { creadasPorMi: [] as AccionDiaria[], asignadasComoResponsable: [] as AccionDiaria[] }
    }
    const creadas: AccionDiaria[] = []
    const asignadas: AccionDiaria[] = []
    for (const a of acciones) {
      if (a.created_by === usuarioId) creadas.push(a)
      else asignadas.push(a)
    }
    return { creadasPorMi: creadas, asignadasComoResponsable: asignadas }
  }, [acciones, usuarioId])

  const exec = useMemo(() => accionExecMetrics(acciones), [acciones])
  const mCreadas = useMemo(() => accionExecMetrics(creadasPorMi), [creadasPorMi])
  const mAsignadas = useMemo(() => accionExecMetrics(asignadasComoResponsable), [asignadasComoResponsable])

  const fechaRel =
    fecha === today
      ? 'hoy'
      : new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { dateStyle: 'medium' })

  const lineaEjecutiva = useMemo(() => {
    const totalWord = exec.total === 1 ? 'acción' : 'acciones'
    const parts = [
      `${exec.total} ${totalWord}`,
      `${exec.enCurso} en curso`,
      `${exec.cerradas} cerrada${exec.cerradas !== 1 ? 's' : ''}`,
      exec.riesgo > 0 ? `${exec.riesgo} en riesgo` : 'sin riesgos',
    ]
    return parts.join(' · ')
  }, [exec])

  if (!usuarioId) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
        Inicia sesión para ver tus acciones del día.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-2xl border border-foreground/10 bg-card p-5 shadow-md',
        'ring-1 ring-foreground/[0.06] lg:min-h-[320px]'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/90 dark:text-emerald-400/90">
            Ejecución
          </p>
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Acciones del día
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Responsable · creadas hasta{' '}
            <span className="font-medium text-foreground/90">{fechaRel}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-lg border-border/80" asChild>
            <Link to={ROUTES.DASHBOARD}>
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
              Tablero completo
            </Link>
          </Button>
          <Button size="sm" className="h-9 rounded-lg shadow-sm" asChild>
            <Link to={`${ROUTES.KANBAN}?fecha=${encodeURIComponent(fecha)}`}>
              <Columns3 className="mr-1.5 h-3.5 w-3.5" />
              Ver Kanban
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-6">
        {isError ? (
          <p className="text-sm text-destructive">No se pudieron cargar las acciones.</p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden />
            Cargando…
          </div>
        ) : (
          <>
            <p className="text-base font-medium leading-snug tracking-tight text-foreground sm:text-lg">
              {lineaEjecutiva}
            </p>
            {exec.riesgo > 0 ? (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">Riesgo</span> = acciones cerradas sin evidencia cargada. Abre la
                  acción desde la lista o en el Kanban y adjunta documentos si aplica.
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <BigStat label="En curso" value={exec.enCurso} tone="amber" />
              <BigStat label="Cerradas" value={exec.cerradas} tone="emerald" />
              <BigStat
                label="Riesgo"
                value={exec.riesgo}
                tone={exec.riesgo > 0 ? 'risk' : 'default'}
                hint={exec.riesgo > 0 ? 'Sin evidencia' : 'Sin alertas'}
              />
            </div>

            <div className="border-t border-border/50 pt-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Tú como responsable
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Toca una acción para abrirla en el Kanban con el detalle y la fecha ya alineadas.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <GrupoAccionesLista
                  titulo="Creaste"
                  descripcion="Acciones que registraste como responsable en esta fecha."
                  icon={PenLine}
                  items={creadasPorMi}
                  fechaRef={fecha}
                  metricsHint={`${mCreadas.total} ${mCreadas.total === 1 ? 'acción' : 'acciones'} ${grupoParentesis(mCreadas)}`}
                />
                <GrupoAccionesLista
                  titulo="Te asignaron"
                  descripcion="Asignadas por otro usuario; sigues siendo responsable."
                  icon={UserPlus}
                  items={asignadasComoResponsable}
                  fechaRef={fecha}
                  metricsHint={`${mAsignadas.total} ${mAsignadas.total === 1 ? 'acción' : 'acciones'} ${grupoParentesis(mAsignadas)}`}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
