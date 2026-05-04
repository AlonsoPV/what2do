/**
 * Tablero Kanban rediseñado — estilo SaaS/producto moderno.
 * Columnas con acento visual, cards premium, empty states, scroll refinado.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { AccionDiaria, ActionStatus, PrioridadNc } from '@/types'
import { useUpdateAccionEstado } from '../hooks/useAccionMutations'
import { useCommentCounts } from '../hooks/useCommentCounts'
import { useActionEstadoPermissions } from '../hooks/useActionEstadoPermissions'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { isEnRetraso } from '../utils/accionUtils'
import { isEstadoConPermisoEstricto } from '../utils/actionPermissions'
import { CountdownTimer } from './CountdownTimer'
import { AccionIdDisplay } from './AccionIdDisplay'
import { EvidenciaCargadaIndicator } from './EvidenciaCargadaIndicator'
import {
  AlertCircle,
  FileCheck,
  Clock,
  Sun,
  PlayCircle,
  CheckCircle,
  BadgeCheck,
  Plus,
  AlertTriangle,
  Pencil,
  MoreVertical,
  MessageSquare,
  Info,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AccionChecklistProgressBadge } from './AccionChecklistProgress'

const COLUMN_ORDER: ActionStatus[] = [
  'Pendiente',
  'Hoy',
  'En_Ejecucion',
  'Bloqueado',
  'Retraso',
  'Hecho',
  'Verificado',
]

const COLUMN_LABELS: Record<ActionStatus, string> = {
  Pendiente: 'Pendiente',
  Hoy: 'Hoy',
  En_Ejecucion: 'En ejecución',
  Bloqueado: 'Bloqueado',
  Retraso: 'Retraso',
  Hecho: 'Hecho',
  Verificado: 'Verificado',
}

const COLUMN_ICONS: Record<ActionStatus, React.ComponentType<{ className?: string }>> = {
  Pendiente: Clock,
  Hoy: Sun,
  En_Ejecucion: PlayCircle,
  Bloqueado: AlertCircle,
  Retraso: AlertTriangle,
  Hecho: CheckCircle,
  Verificado: BadgeCheck,
}

const COLUMN_DESCRIPTIONS: Record<ActionStatus, string> = {
  Pendiente: 'Acción creada, aún no programada para hoy ni en ejecución.',
  Hoy: 'Acción programada para hoy; pendiente de iniciar.',
  En_Ejecucion: 'Acción en curso.',
  Bloqueado: 'Acción detenida por un impedimento; requiere desbloqueo.',
  Retraso: 'Acción que superó su fecha o hora límite sin completarse.',
  Hecho: 'Acción completada.',
  Verificado: 'Acción cerrada y verificada.',
}

/** Acento por columna: borde izquierdo + fondo muy sutil */
const COLUMN_STYLES: Record<ActionStatus, { border: string; bg: string; icon: string }> = {
  Pendiente: {
    border: 'border-l-slate-400',
    bg: 'bg-slate-500/5',
    icon: 'text-slate-500',
  },
  Hoy: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-500/5',
    icon: 'text-amber-600',
  },
  En_Ejecucion: {
    border: 'border-l-blue-400',
    bg: 'bg-blue-500/5',
    icon: 'text-blue-600',
  },
  Bloqueado: {
    border: 'border-l-red-400',
    bg: 'bg-red-500/5',
    icon: 'text-red-600',
  },
  Retraso: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/5',
    icon: 'text-orange-600',
  },
  Hecho: {
    border: 'border-l-emerald-400',
    bg: 'bg-emerald-500/5',
    icon: 'text-emerald-600',
  },
  Verificado: {
    border: 'border-l-violet-400',
    bg: 'bg-violet-500/5',
    icon: 'text-violet-600',
  },
}


const PRIORITY_STYLES: Record<PrioridadNc, { dot: string; label: string }> = {
  P1_Critica: { dot: 'bg-red-500', label: 'Crítica' },
  P2_Media: { dot: 'bg-amber-500', label: 'Media' },
  P3_Baja: { dot: 'bg-slate-400', label: 'Baja' },
}

/** Acciones visibles por columna antes de expandir (el resto queda colapsado). */
const COLUMN_PREVIEW_LIMIT = 3

type ColumnSortBy = 'fecha_entrega' | 'prioridad'

const PRIORITY_SORT_RANK: Record<PrioridadNc, number> = {
  P1_Critica: 0,
  P2_Media: 1,
  P3_Baja: 2,
}

function deliveryTimestampMs(a: AccionDiaria): number {
  const time = a.hora_limite?.length === 5 ? `${a.hora_limite}:00` : a.hora_limite ?? '00:00:00'
  const ms = Date.parse(`${a.fecha}T${time}`)
  return Number.isFinite(ms) ? ms : 0
}

function sortAccionesByColumnPreference(actions: AccionDiaria[], sortBy: ColumnSortBy): AccionDiaria[] {
  const list = [...actions]
  if (sortBy === 'fecha_entrega') {
    list.sort((a, b) => deliveryTimestampMs(a) - deliveryTimestampMs(b))
  } else {
    list.sort(
      (a, b) =>
        (PRIORITY_SORT_RANK[a.prioridad] ?? 99) - (PRIORITY_SORT_RANK[b.prioridad] ?? 99)
    )
  }
  return list
}

/** Estilos compartidos del carril horizontal (tablero y skeleton). */
const KANBAN_H_SCROLL_CLASSES =
  '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 hover:[&::-webkit-scrollbar-thumb]:bg-border'

function KanbanBoardScrollArea({
  id,
  columnCount,
  children,
}: {
  id: string
  columnCount: number
  children: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const refreshEdges = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    if (maxScroll <= 0) {
      setEdges({ left: false, right: false })
      return
    }
    setEdges({
      left: scrollLeft > 1,
      right: scrollLeft < maxScroll - 1,
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    refreshEdges()
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(refreshEdges)
    })
    ro.observe(el)
    el.addEventListener('scroll', refreshEdges, { passive: true })
    window.addEventListener('resize', refreshEdges)
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', refreshEdges)
      window.removeEventListener('resize', refreshEdges)
    }
  }, [refreshEdges, columnCount])

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const delta = Math.min(Math.floor(el.clientWidth * 0.72), 360)
    el.scrollBy({ left: dir * delta, behavior: 'smooth' })
  }, [])

  const showNav = columnCount > 1

  return (
    <div className="relative min-w-0">
      {/* Botones fuera del carril de scroll (capa superior solo en el margen); el padding del carril evita que las columnas queden debajo. */}
      {showNav && edges.left ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="pointer-events-auto absolute left-1 top-1/2 z-30 h-8 w-8 -translate-y-1/2 rounded-full border border-border/50 bg-background shadow-md hover:bg-background"
          onClick={() => scrollByDir(-1)}
          aria-label="Desplazar columnas hacia la izquierda"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : null}
      {showNav && edges.right ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="pointer-events-auto absolute right-1 top-1/2 z-30 h-8 w-8 -translate-y-1/2 rounded-full border border-border/50 bg-background shadow-md hover:bg-background"
          onClick={() => scrollByDir(1)}
          aria-label="Desplazar columnas hacia la derecha"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}
      <div
        ref={scrollRef}
        id={id}
        className={cn(
          'kanban-board flex gap-4 overflow-x-auto overscroll-x-contain pb-4 pt-1 sm:gap-5',
          /* Reserva fija para que el contenido (columnas) nunca quede bajo los botones ni se recorte con efecto de velo */
          showNav ? 'scroll-pl-10 scroll-pr-10 px-10' : 'px-0.5',
          'scroll-smooth snap-x snap-mandatory touch-pan-x',
          KANBAN_H_SCROLL_CLASSES
        )}
      >
        {children}
      </div>
    </div>
  )
}

export interface KanbanBoardProps {
  acciones: AccionDiaria[]
  isLoading?: boolean
  responsableNames?: Record<string, string>
  onSelectAccion?: (accion: AccionDiaria) => void
  onNewAction?: () => void
  /** Cuando está definido, se muestra solo la columna de este estado (sincronizado con el filtro de la toolbar). */
  filterEstado?: ActionStatus
  /**
   * Si es true y no hay `filterEstado`, solo se muestran columnas con al menos una tarjeta
   * (p. ej. filtro por prioridad/área/responsable ya aplicado en `acciones`).
   */
  narrowToOccupiedColumns?: boolean
  /** Progreso de checklist por acción (checkpoints activos). */
  checklistProgressByAccionId?: Record<string, { total: number; completed: number }>
}

function KanbanCardInner({
  accion,
  responsableName,
  commentCount = 0,
  isDragging,
  isOverlay,
  dragHandleProps,
  onClick,
  onMoveEstado,
  checklistProgress,
  estadoPermission,
}: {
  accion: AccionDiaria
  responsableName: string
  commentCount?: number
  isDragging?: boolean
  isOverlay?: boolean
  dragHandleProps?: { attributes: object; listeners?: object }
  onClick?: () => void
  onMoveEstado?: (estado: ActionStatus) => void
  checklistProgress?: { total: number; completed: number }
  estadoPermission?: ReturnType<typeof useActionEstadoPermissions>
}) {
  const priorityStyle = PRIORITY_STYLES[accion.prioridad] ?? PRIORITY_STYLES.P2_Media
  const displayStatus = isEnRetraso(accion) ? 'Retraso' : accion.estado

  const stopDrag = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      {...(dragHandleProps?.attributes ?? {})}
      {...(dragHandleProps?.listeners ?? {})}
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border border-border/60 bg-card p-3.5 text-left shadow-sm',
        'transition-all duration-200 ease-out',
        !isOverlay && 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-border',
        isDragging && 'opacity-40 scale-[0.98]',
        isOverlay && 'cursor-grabbing shadow-xl ring-2 ring-primary/10 scale-[1.02]'
      )}
    >
      {!isOverlay && (
        <div className="absolute right-2 top-2 flex items-center gap-0.5" onPointerDown={stopDrag}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onClick?.() }}
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {onMoveEstado && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Mover estado"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                {COLUMN_ORDER.filter((s) => s !== displayStatus).map((status) => {
                  const restricted =
                    estadoPermission && isEstadoConPermisoEstricto(status)
                      ? !estadoPermission.canChangeTo(accion, status)
                      : false
                  const denyTitle = restricted
                    ? estadoPermission?.denialMessage(accion, status) ?? undefined
                    : undefined
                  return (
                    <DropdownMenuItem
                      key={status}
                      disabled={restricted}
                      title={denyTitle}
                      onClick={() => onMoveEstado?.(status)}
                    >
                      {COLUMN_LABELS[status]}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
      <div className="flex items-start gap-2 pr-14">
        <span
          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', priorityStyle.dot)}
          title={priorityStyle.label}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground line-clamp-2" title={accion.descripcion_accion}>
            {accion.titulo_accion?.trim() || accion.descripcion_accion}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            ID <AccionIdDisplay id={accion.id} className="inline align-baseline" />
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
        <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={responsableName}>
          {responsableName}
        </span>
        <CountdownTimer
          fecha={accion.fecha}
          hora_limite={accion.hora_limite}
          estado={accion.estado}
          variant="compact"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {commentCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded bg-muted/80 px-1.5 py-0.5 text-xs text-muted-foreground"
            title={`${commentCount} comentario${commentCount !== 1 ? 's' : ''}`}
          >
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        )}
        {accion.estado === 'Bloqueado' && (
          <span
            className="inline-flex items-center gap-0.5 rounded border border-destructive/30 bg-destructive/15 px-1.5 py-0.5 text-xs text-destructive"
            title="Bloqueado"
          >
            <AlertCircle className="h-3 w-3" />
          </span>
        )}
        <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} />
        {checklistProgress && checklistProgress.total > 0 && (
          <AccionChecklistProgressBadge
            completados={checklistProgress.completed}
            total={checklistProgress.total}
          />
        )}
        {!accion.evidencia_cargada && (accion.estado === 'Hecho' || accion.estado === 'Verificado') && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600" title="Sin evidencia">
            <FileCheck className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanCard({
  accion,
  responsableName,
  commentCount = 0,
  onSelectAccion,
  onMoveEstado,
  checklistProgress,
  estadoPermission,
}: {
  accion: AccionDiaria
  responsableName: string
  commentCount?: number
  onSelectAccion?: (accion: AccionDiaria) => void
  onMoveEstado?: (accion: AccionDiaria, estado: ActionStatus) => void
  checklistProgress?: { total: number; completed: number }
  estadoPermission?: ReturnType<typeof useActionEstadoPermissions>
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: accion.id,
    data: { accion },
  })
  return (
    <div ref={setNodeRef} className="kanban-card transition-transform duration-200" data-accion-id={accion.id}>
      <KanbanCardInner
        accion={accion}
        responsableName={responsableName}
        commentCount={commentCount}
        isDragging={isDragging}
        dragHandleProps={{ attributes, listeners }}
        onClick={() => onSelectAccion?.(accion)}
        onMoveEstado={
          onMoveEstado ? (estado) => onMoveEstado(accion, estado) : undefined
        }
        checklistProgress={checklistProgress}
        estadoPermission={estadoPermission}
      />
    </div>
  )
}

function KanbanColumnEmpty({ status, onNewAction }: { status: ActionStatus; onNewAction?: () => void }) {
  const Icon = COLUMN_ICONS[status]
  const label = COLUMN_LABELS[status]
  const style = COLUMN_STYLES[status]
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
      <Icon className={cn('mb-2 h-8 w-8', style.icon, 'opacity-60')} />
      <p className="text-sm font-medium text-muted-foreground">Sin acciones en {label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/80">
        Arrastra aquí o crea una nueva
      </p>
      {onNewAction && (
        <button
          type="button"
          onClick={onNewAction}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva acción
        </button>
      )}
    </div>
  )
}

function KanbanColumn({
  status,
  actions,
  responsableNames,
  commentCounts = {},
  onSelectAccion,
  onNewAction,
  onMoveEstado,
  checklistProgressByAccionId = {},
  /** Tarjeta activa no puede entrar a esta columna (Hecho/Verificado); solo UI — la validación final es al soltar. */
  dropForbidden = false,
  estadoPermission,
}: {
  status: ActionStatus
  actions: AccionDiaria[]
  responsableNames: Record<string, string>
  commentCounts?: Record<string, number>
  onSelectAccion?: (accion: AccionDiaria) => void
  onNewAction?: () => void
  onMoveEstado?: (accion: AccionDiaria, estado: ActionStatus) => void
  checklistProgressByAccionId?: Record<string, { total: number; completed: number }>
  dropForbidden?: boolean
  estadoPermission?: ReturnType<typeof useActionEstadoPermissions>
}) {
  const [expanded, setExpanded] = useState(false)
  const [sortBy, setSortBy] = useState<ColumnSortBy>('fecha_entrega')

  const sortedActions = useMemo(
    () => sortAccionesByColumnPreference(actions, sortBy),
    [actions, sortBy]
  )

  const hasOverflow = sortedActions.length > COLUMN_PREVIEW_LIMIT
  const visibleActions = useMemo(() => {
    if (!hasOverflow || expanded) return sortedActions
    return sortedActions.slice(0, COLUMN_PREVIEW_LIMIT)
  }, [sortedActions, hasOverflow, expanded])

  const hiddenCount = sortedActions.length - COLUMN_PREVIEW_LIMIT

  const { setNodeRef, isOver } = useDroppable({ id: status })
  const style = COLUMN_STYLES[status]
  const Icon = COLUMN_ICONS[status]
  const label = COLUMN_LABELS[status]

  return (
    <div
      ref={setNodeRef}
      data-status={status}
      className={cn(
        'kanban-column flex w-[min(300px,calc(100vw-1.25rem))] shrink-0 snap-start flex-col rounded-2xl border border-border/50 border-l-4 transition-all duration-200 sm:w-[300px] sm:min-w-[280px] sm:max-w-[300px]',
        style.border,
        style.bg,
        isOver &&
          (dropForbidden
            ? 'ring-2 ring-destructive/35 ring-offset-2 ring-offset-background'
            : 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background')
      )}
    >
      <div className="kanban-column-header flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn('h-4 w-4 shrink-0', style.icon)} />
          <h3 className="truncate text-sm font-semibold text-foreground">
            {label}
          </h3>
          <div className="group relative shrink-0">
            <button
              type="button"
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-background/80',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background'
              )}
              title="Ver descripción del estado"
              aria-label={`Descripción: ${COLUMN_DESCRIPTIONS[status]}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-0 top-full z-50 mt-1.5 max-w-[260px] rounded-lg border border-border/80 bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-lg',
                'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
                'border-l-4',
                style.border
              )}
            >
              <p className="leading-snug text-muted-foreground">
                {COLUMN_DESCRIPTIONS[status]}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                  title="Ordenar"
                  aria-label="Ordenar acciones de la columna"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => setSortBy('fecha_entrega')}
                >
                  <span className="flex-1">Fecha de entrega</span>
                  {sortBy === 'fecha_entrega' ? (
                    <Check className="h-4 w-4 shrink-0 opacity-80" />
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => setSortBy('prioridad')}
                >
                  <span className="flex-1">Prioridad</span>
                  {sortBy === 'prioridad' ? (
                    <Check className="h-4 w-4 shrink-0 opacity-80" />
                  ) : null}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <span className="min-w-[24px] rounded-full bg-background/80 px-2.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {actions.length}
          </span>
        </div>
      </div>
      <div className="kanban-column-cards flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border">
        {actions.length === 0 ? (
          <KanbanColumnEmpty status={status} onNewAction={onNewAction} />
        ) : (
          <>
            {visibleActions.map((accion) => (
              <KanbanCard
                key={accion.id}
                accion={accion}
                responsableName={responsableNames[accion.responsable] ?? accion.responsable ?? '—'}
                commentCount={commentCounts[accion.id] ?? 0}
                onSelectAccion={onSelectAccion}
                onMoveEstado={onMoveEstado}
                checklistProgress={checklistProgressByAccionId[accion.id]}
                estadoPermission={estadoPermission}
              />
            ))}
            {hasOverflow ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-muted/20 py-2.5 text-xs font-medium text-muted-foreground',
                  'transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground'
                )}
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Ver {hiddenCount} más
                  </>
                )}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function KanbanBoardSkeleton({ columns = COLUMN_ORDER }: { columns?: ActionStatus[] }) {
  return (
    <div
      id="kanban-board"
      className={cn(
        'kanban-board kanban-board-skeleton relative min-w-0 flex gap-4 overflow-x-auto overscroll-x-contain px-0.5 pb-4 sm:gap-5',
        'scroll-smooth snap-x snap-mandatory touch-pan-x',
        KANBAN_H_SCROLL_CLASSES
      )}
    >
      {columns.map((status) => (
        <div
          key={status}
          className="kanban-column flex w-[min(300px,calc(100vw-1.25rem))] shrink-0 snap-start flex-col rounded-2xl border border-border/50 bg-muted/10 p-4 sm:w-[300px] sm:min-w-[280px] sm:max-w-[300px]"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-muted/60"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function KanbanBoard({
  acciones,
  isLoading,
  responsableNames = {},
  onSelectAccion,
  onNewAction,
  filterEstado,
  narrowToOccupiedColumns = false,
  checklistProgressByAccionId = {},
}: KanbanBoardProps) {
  const updateEstado = useUpdateAccionEstado()
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: currentUser } = useCurrentUser()
  const estadoPermission = useActionEstadoPermissions(currentUser ?? undefined)
  const { data: commentCounts = {} } = useCommentCounts(acciones.map((a) => a.id))

  const byStatus = useMemo(() => {
    const map: Record<ActionStatus, AccionDiaria[]> = {
      Pendiente: [],
      Hoy: [],
      En_Ejecucion: [],
      Bloqueado: [],
      Retraso: [],
      Hecho: [],
      Verificado: [],
    }
    for (const a of acciones) {
      const status = isEnRetraso(a) ? 'Retraso' : a.estado
      if (map[status]) map[status].push(a)
    }
    return map
  }, [acciones])

  const columnsToShow = useMemo(() => {
    if (filterEstado && COLUMN_ORDER.includes(filterEstado)) return [filterEstado]
    if (narrowToOccupiedColumns) {
      const occupied = COLUMN_ORDER.filter((s) => (byStatus[s]?.length ?? 0) > 0)
      return occupied.length > 0 ? occupied : COLUMN_ORDER
    }
    return COLUMN_ORDER
  }, [filterEstado, narrowToOccupiedColumns, byStatus])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const activeAccion = useMemo(
    () => (activeId ? acciones.find((a) => a.id === activeId) : null),
    [activeId, acciones]
  )

  const isColumnDropDisabled = useCallback(
    (columnStatus: ActionStatus) => {
      if (!activeAccion) return false
      const currentDisplay = isEnRetraso(activeAccion) ? 'Retraso' : activeAccion.estado
      if (currentDisplay === columnStatus) return false
      return !estadoPermission.canChangeTo(activeAccion, columnStatus)
    },
    [activeAccion, estadoPermission]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return
      // over.id es el id del droppable (columna) = status; active.id es el id de la acción
      const newStatus = COLUMN_ORDER.find((s) => s === over.id) as ActionStatus | undefined
      if (!newStatus) return
      const accion = acciones.find((a) => a.id === active.id)
      if (!accion) return
      const currentDisplay = isEnRetraso(accion) ? 'Retraso' : accion.estado
      if (currentDisplay === newStatus) return
      const denied = estadoPermission.denialMessage(accion, newStatus)
      if (denied) {
        toast.error(denied)
        return
      }
      updateEstado.mutate(
        { id: accion.id, estado: newStatus },
        {
          onSuccess: () => toast.success('Estado actualizado'),
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar estado'),
        }
      )
    },
    [acciones, updateEstado, estadoPermission]
  )

  const handleMoveEstado = useCallback(
    (accion: AccionDiaria, estado: ActionStatus) => {
      const denied = estadoPermission.denialMessage(accion, estado)
      if (denied) {
        toast.error(denied)
        return
      }
      updateEstado.mutate(
        { id: accion.id, estado },
        {
          onSuccess: () => toast.success('Estado actualizado'),
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar estado'),
        }
      )
    },
    [updateEstado, estadoPermission]
  )

  if (isLoading) {
    return <KanbanBoardSkeleton columns={columnsToShow} />
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <KanbanBoardScrollArea id="kanban-board" columnCount={columnsToShow.length}>
        {columnsToShow.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            actions={byStatus[status] ?? []}
            responsableNames={responsableNames}
            commentCounts={commentCounts}
            onSelectAccion={onSelectAccion}
            onNewAction={onNewAction}
            onMoveEstado={handleMoveEstado}
            checklistProgressByAccionId={checklistProgressByAccionId}
            dropForbidden={isColumnDropDisabled(status)}
            estadoPermission={estadoPermission}
          />
        ))}
      </KanbanBoardScrollArea>
      <DragOverlay dropAnimation={null}>
        {activeAccion ? (
          <div className="w-[280px]">
            <KanbanCardInner
              accion={activeAccion}
              responsableName={responsableNames[activeAccion.responsable] ?? activeAccion.responsable ?? '—'}
              commentCount={commentCounts[activeAccion.id] ?? 0}
              isOverlay
              checklistProgress={checklistProgressByAccionId[activeAccion.id]}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
