/**
 * Tablero Kanban rediseñado — estilo SaaS/producto moderno.
 * Columnas con acento visual, cards premium, empty states, scroll refinado.
 */

import { useCallback, useMemo, useState } from 'react'
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
import { isEnRetraso } from '../utils/accionUtils'
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
  Hecho: 'Acción completada con evidencia cargada.',
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

export interface KanbanBoardProps {
  acciones: AccionDiaria[]
  isLoading?: boolean
  responsableNames?: Record<string, string>
  onSelectAccion?: (accion: AccionDiaria) => void
  onNewAction?: () => void
  /** Cuando está definido, se muestra solo la columna de este estado (sincronizado con el filtro de la toolbar). */
  filterEstado?: ActionStatus
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
        'group relative rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm',
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
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {COLUMN_ORDER.filter((s) => s !== displayStatus).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onMoveEstado(status)}
                  >
                    {COLUMN_LABELS[status]}
                  </DropdownMenuItem>
                ))}
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
          <span className="inline-flex items-center gap-0.5 rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-600" title="Bloqueado">
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
}: {
  accion: AccionDiaria
  responsableName: string
  commentCount?: number
  onSelectAccion?: (accion: AccionDiaria) => void
  onMoveEstado?: (accion: AccionDiaria, estado: ActionStatus) => void
  checklistProgress?: { total: number; completed: number }
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
}: {
  status: ActionStatus
  actions: AccionDiaria[]
  responsableNames: Record<string, string>
  commentCounts?: Record<string, number>
  onSelectAccion?: (accion: AccionDiaria) => void
  onNewAction?: () => void
  onMoveEstado?: (accion: AccionDiaria, estado: ActionStatus) => void
  checklistProgressByAccionId?: Record<string, { total: number; completed: number }>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const style = COLUMN_STYLES[status]
  const Icon = COLUMN_ICONS[status]
  const label = COLUMN_LABELS[status]

  return (
    <div
      ref={setNodeRef}
      data-status={status}
      className={cn(
        'kanban-column flex min-w-[280px] max-w-[300px] shrink-0 flex-col rounded-2xl border border-border/50 border-l-4 transition-all duration-200',
        style.border,
        style.bg,
        isOver && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background'
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
        <span className="shrink-0 rounded-full bg-background/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {actions.length}
        </span>
      </div>
      <div className="kanban-column-cards flex min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border">
        {actions.length === 0 ? (
          <KanbanColumnEmpty status={status} onNewAction={onNewAction} />
        ) : (
          actions.map((accion) => (
            <KanbanCard
              key={accion.id}
              accion={accion}
              responsableName={responsableNames[accion.responsable] ?? accion.responsable ?? '—'}
              commentCount={commentCounts[accion.id] ?? 0}
              onSelectAccion={onSelectAccion}
              onMoveEstado={onMoveEstado}
              checklistProgress={checklistProgressByAccionId[accion.id]}
            />
          ))
        )}
      </div>
    </div>
  )
}

function KanbanBoardSkeleton({ columns = COLUMN_ORDER }: { columns?: ActionStatus[] }) {
  return (
    <div id="kanban-board" className="kanban-board kanban-board-skeleton flex gap-4 overflow-hidden pb-4">
      {columns.map((status) => (
        <div
          key={status}
          className="kanban-column flex min-w-[280px] max-w-[300px] shrink-0 flex-col rounded-2xl border border-border/50 bg-muted/10 p-4"
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
  checklistProgressByAccionId = {},
}: KanbanBoardProps) {
  const updateEstado = useUpdateAccionEstado()
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: commentCounts = {} } = useCommentCounts(acciones.map((a) => a.id))

  const columnsToShow = useMemo(() => {
    if (filterEstado && COLUMN_ORDER.includes(filterEstado)) return [filterEstado]
    return COLUMN_ORDER
  }, [filterEstado])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

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

  const activeAccion = useMemo(
    () => (activeId ? acciones.find((a) => a.id === activeId) : null),
    [activeId, acciones]
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
      updateEstado.mutate(
        { id: accion.id, estado: newStatus },
        {
          onSuccess: () => toast.success('Estado actualizado'),
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar estado'),
        }
      )
    },
    [acciones, updateEstado]
  )

  const handleMoveEstado = useCallback(
    (accion: AccionDiaria, estado: ActionStatus) => {
      updateEstado.mutate(
        { id: accion.id, estado },
        {
          onSuccess: () => toast.success('Estado actualizado'),
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar estado'),
        }
      )
    },
    [updateEstado]
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
      <div
        id="kanban-board"
        className={cn(
          'kanban-board flex gap-5 overflow-x-auto pb-4 pt-1',
          '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 hover:[&::-webkit-scrollbar-thumb]:bg-border'
        )}
      >
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
          />
        ))}
      </div>
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
