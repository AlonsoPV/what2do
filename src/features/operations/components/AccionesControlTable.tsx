/**
 * Tabla de control de acciones del día (spec §4.2 AccionesControlTable).
 * Vista cuadrícula optimizada: cabecera fija, bordes por estado, prioridad y indicadores claros.
 */

import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AccionDiaria } from '@/types'
import { cn } from '@/lib/utils'
import { isEnRetraso } from '../utils/accionUtils'
import { accionStoryPoints } from '@/features/kpi/utils/gapProgress'
import {
  accionEstadoBadgeClass,
  accionEstadoLabel,
  getAccionDisplayEstado,
} from '../utils/accionEstadoDisplay'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  FileCheck,
  ClipboardList,
  Plus,
  MessageSquare,
} from 'lucide-react'
import { AccionIdDisplay } from './AccionIdDisplay'
import { EvidenciaCargadaIndicator } from './EvidenciaCargadaIndicator'
import { AccionChecklistProgressBadge } from './AccionChecklistProgress'
import { TIPO_ACCION_CONFIG, type TipoAccion } from '../utils/tipoAccionConfig'
import { usePriorities } from '@/features/catalogs/hooks/usePriorities'
import { useStatuses } from '@/features/catalogs/hooks/useStatuses'
import type { Priority } from '@/features/catalogs/types/catalogs.types'
import { AccionPriorityBadge } from './AccionPriorityBadge'
import { findPriorityForAccion } from '../utils/resolveAccionPrioridad'
import { statusCatalogByKey, statusCatalogLabel } from '../utils/statusCatalog'

const PRIORIDAD_SORT_ORDER: Record<string, number> = {
  P1_Critica: 1,
  P2_Media: 2,
  P3_Baja: 3,
}

const ESTADO_SORT_ORDER: Record<string, number> = {
  Retrasa: 0,
  En_Pausa: 1,
  En_Proceso: 2,
  Completada: 3,
}

export type AccionControlSortKey =
  | 'id'
  | 'descripcion'
  | 'estado'
  | 'responsable'
  | 'pts'
  | 'fecha'
  | 'prioridad'
  | 'indicadores'

type SortDir = 'asc' | 'desc'
type IndicadoresMode = 'full' | 'checklist'

const DEFAULT_SORT: { key: AccionControlSortKey; dir: SortDir } = { key: 'fecha', dir: 'asc' }

/** Borde izquierdo sutil por estado para escaneo rápido */
const ESTADO_ROW_BORDER: Record<string, string> = {
  En_Pausa: 'border-l-4 border-l-slate-400',
  En_Proceso: 'border-l-4 border-l-blue-400',
  Completada: 'border-l-4 border-l-emerald-400',
  Retrasa: 'border-l-4 border-l-orange-500',
}

function formatFechaLimite(fecha: string): string {
  const parts = fecha.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return fecha
  const [y, m, d] = parts
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatStoryPoints(accion: AccionDiaria): string {
  const pts = accionStoryPoints(accion)
  return pts > 0 ? String(pts) : '—'
}

function accionTitulo(accion: AccionDiaria): string {
  return (accion.titulo_accion?.trim() || accion.descripcion_accion || '').toLocaleLowerCase('es')
}

function accionEstadoSortValue(accion: AccionDiaria): number {
  const key = getAccionDisplayEstado(accion)
  return ESTADO_SORT_ORDER[key] ?? 99
}

function indicadoresSortValue(
  accion: AccionDiaria,
  commentCounts: Record<string, number>,
  checklistProgressByAccionId: Record<string, { total: number; completed: number }>,
  indicadoresMode: IndicadoresMode
): number {
  const prog = checklistProgressByAccionId[accion.id]
  if (indicadoresMode === 'checklist') {
    if (!prog || prog.total <= 0) return -1
    return Math.round((prog.completed / prog.total) * 100)
  }

  let score = 0
  score += (commentCounts[accion.id] ?? 0) * 10
  if (prog && prog.total > 0) score += Math.round((prog.completed / prog.total) * 20)
  if (accion.evidencia_cargada) score += 5
  if (isEnRetraso(accion)) score += 50
  if (accion.estado === 'En_Pausa') score += 20
  return score
}

function compareAccionesControl(
  a: AccionDiaria,
  b: AccionDiaria,
  sortKey: AccionControlSortKey,
  sortDir: SortDir,
  responsableNames: Record<string, string>,
  commentCounts: Record<string, number>,
  checklistProgressByAccionId: Record<string, { total: number; completed: number }>,
  indicadoresMode: IndicadoresMode,
  priorities: Priority[]
): number {
  let cmp = 0
  switch (sortKey) {
    case 'id':
      cmp = a.id.localeCompare(b.id)
      break
    case 'descripcion':
      cmp = accionTitulo(a).localeCompare(accionTitulo(b), 'es')
      break
    case 'estado':
      cmp = accionEstadoSortValue(a) - accionEstadoSortValue(b)
      break
    case 'responsable': {
      const na = (responsableNames[a.responsable] ?? a.responsable ?? '').toLocaleLowerCase('es')
      const nb = (responsableNames[b.responsable] ?? b.responsable ?? '').toLocaleLowerCase('es')
      cmp = na.localeCompare(nb, 'es')
      break
    }
    case 'pts':
      cmp = accionStoryPoints(a) - accionStoryPoints(b)
      break
    case 'fecha':
      cmp = a.fecha.localeCompare(b.fecha) || (a.hora_limite ?? '').localeCompare(b.hora_limite ?? '')
      break
    case 'prioridad':
      cmp = (
        findPriorityForAccion(a, priorities)?.orden ??
        PRIORIDAD_SORT_ORDER[a.prioridad] ??
        99
      ) - (
        findPriorityForAccion(b, priorities)?.orden ??
        PRIORIDAD_SORT_ORDER[b.prioridad] ??
        99
      )
      break
    case 'indicadores':
      cmp =
        indicadoresSortValue(a, commentCounts, checklistProgressByAccionId, indicadoresMode) -
        indicadoresSortValue(b, commentCounts, checklistProgressByAccionId, indicadoresMode)
      break
  }
  return sortDir === 'asc' ? cmp : -cmp
}

function sortAccionesControl(
  acciones: AccionDiaria[],
  sortKey: AccionControlSortKey,
  sortDir: SortDir,
  responsableNames: Record<string, string>,
  commentCounts: Record<string, number>,
  checklistProgressByAccionId: Record<string, { total: number; completed: number }>,
  indicadoresMode: IndicadoresMode,
  priorities: Priority[]
): AccionDiaria[] {
  return [...acciones].sort((a, b) =>
    compareAccionesControl(a, b, sortKey, sortDir, responsableNames, commentCounts, checklistProgressByAccionId, indicadoresMode, priorities)
  )
}

type StatusCatalogMap = ReturnType<typeof statusCatalogByKey>

function AccionSortHeader({
  columnKey,
  label,
  sortKey,
  sortDir,
  onToggle,
  className,
}: {
  columnKey: AccionControlSortKey
  label: string
  sortKey: AccionControlSortKey
  sortDir: SortDir
  onToggle: (key: AccionControlSortKey) => void
  className?: string
}) {
  const active = sortKey === columnKey
  return (
    <TableHead
      className={cn(
        'sticky top-0 z-10 bg-muted/70 backdrop-blur-sm py-3.5 text-foreground/90',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className={cn(
          'inline-flex w-full items-center gap-1 text-left text-xs font-semibold transition-colors hover:text-foreground',
          active && 'text-foreground'
        )}
        aria-label={`Ordenar por ${label}`}
      >
        <span className="min-w-0 truncate">{label}</span>
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  )
}

const TIPO_ACCION_BADGE: Record<TipoAccion, string> = {
  operativa: 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  sprint: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  estrategica: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  desbloqueo: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200',
}

export interface AccionesControlTableProps {
  acciones: AccionDiaria[]
  isLoading?: boolean
  /** Conteo de comentarios por accion_id (opcional) */
  commentCounts?: Record<string, number>
  /** Si se proporciona, al hacer clic en una fila se llama con la acción (para abrir detalle) */
  onSelectAccion?: (accion: AccionDiaria) => void
  /** Nombres de responsables por id (opcional; si no hay, se muestra el uuid o "—") */
  responsableNames?: Record<string, string>
  /** Progreso de checklist por acción (misma fuente que Kanban). */
  checklistProgressByAccionId?: Record<string, { total: number; completed: number }>
  indicadoresMode?: IndicadoresMode
  /** Mensaje del empty state (opcional) */
  emptyMessage?: string
  /** Etiqueta del botón CTA en empty state (opcional) */
  emptyActionLabel?: string
  /** Callback al pulsar CTA del empty state (opcional) */
  onEmptyAction?: () => void
}

type AccionRowSharedProps = {
  accion: AccionDiaria
  commentCounts: Record<string, number>
  responsableNames: Record<string, string>
  checklistProgressByAccionId: Record<string, { total: number; completed: number }>
  indicadoresMode: IndicadoresMode
  priorities: Priority[]
  statusByKey: StatusCatalogMap
  onSelectAccion?: (accion: AccionDiaria) => void
}

function ChecklistStatusBadge({
  progress,
}: {
  progress?: { total: number; completed: number }
}) {
  if (progress && progress.total > 0) {
    return <AccionChecklistProgressBadge completados={progress.completed} total={progress.total} />
  }

  return (
    <span className="inline-flex rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">
      Sin checklist
    </span>
  )
}

function AccionControlMobileCard({
  accion,
  commentCounts,
  responsableNames,
  checklistProgressByAccionId,
  indicadoresMode,
  priorities,
  statusByKey,
  onSelectAccion,
}: AccionRowSharedProps) {
  const displayStatus = getAccionDisplayEstado(accion)
  const estadoLabel = statusCatalogLabel(displayStatus, statusByKey)
  const rowBorder = ESTADO_ROW_BORDER[displayStatus] ?? 'border-l-4 border-l-border'
  const priority = findPriorityForAccion(accion, priorities)
  const checklistProg = checklistProgressByAccionId[accion.id]
  const comments = commentCounts[accion.id] ?? 0
  const titulo = accion.titulo_accion?.trim() || accion.descripcion_accion
  const Wrapper = onSelectAccion ? 'button' : 'div'

  return (
    <Wrapper
      {...(onSelectAccion
        ? { type: 'button' as const, onClick: () => onSelectAccion(accion) }
        : {})}
      data-accion-id={accion.id}
      className={cn(
        'acciones-control-mobile-card w-full rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left transition-colors',
        rowBorder,
        onSelectAccion && 'cursor-pointer active:bg-muted/40 hover:bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <AccionIdDisplay id={accion.id} variant="compact" className="text-[11px] font-semibold text-foreground" />
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
            accionEstadoBadgeClass(displayStatus)
          )}
        >
          {estadoLabel}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">{titulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="max-w-[55%] truncate">
          {responsableNames[accion.responsable] ?? 'Sin responsable'}
        </span>
        <span className="text-border/80" aria-hidden>
          ·
        </span>
        <span className="font-semibold tabular-nums text-foreground">{formatStoryPoints(accion)} pts</span>
        <AccionPriorityBadge
          prioridad={priority?.nombre ?? accion.prioridad}
          catalogColor={priority?.color}
          compact
          className="max-w-[8rem]"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Fecha límite:</span>{' '}
          <span className="tabular-nums">{formatFechaLimite(accion.fecha)}</span>
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {indicadoresMode === 'checklist' ? (
            <ChecklistStatusBadge progress={checklistProg} />
          ) : (
            <>
              {comments > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {comments}
                </span>
              )}
              {checklistProg && checklistProg.total > 0 && (
                <AccionChecklistProgressBadge
                  completados={checklistProg.completed}
                  total={checklistProg.total}
                />
              )}
              <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} />
              {isEnRetraso(accion) && (
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600" aria-label="Retrasa" />
              )}
            </>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

function AccionesControlMobileList({
  acciones,
  commentCounts,
  responsableNames,
  checklistProgressByAccionId,
  indicadoresMode,
  priorities,
  statusByKey,
  onSelectAccion,
}: {
  acciones: AccionDiaria[]
  commentCounts: Record<string, number>
  responsableNames: Record<string, string>
  checklistProgressByAccionId: Record<string, { total: number; completed: number }>
  indicadoresMode: IndicadoresMode
  priorities: Priority[]
  statusByKey: StatusCatalogMap
  onSelectAccion?: (accion: AccionDiaria) => void
}) {
  return (
    <ul className="acciones-control-mobile-list divide-y divide-border/40 px-2 py-2 sm:px-3">
      {acciones.map((accion) => (
        <li key={accion.id} className="py-1.5 first:pt-0 last:pb-0">
          <AccionControlMobileCard
            accion={accion}
            commentCounts={commentCounts}
            responsableNames={responsableNames}
            checklistProgressByAccionId={checklistProgressByAccionId}
            indicadoresMode={indicadoresMode}
            priorities={priorities}
            statusByKey={statusByKey}
            onSelectAccion={onSelectAccion}
          />
        </li>
      ))}
    </ul>
  )
}

export function AccionesControlTable({
  acciones,
  isLoading,
  commentCounts = {},
  onSelectAccion,
  responsableNames = {},
  checklistProgressByAccionId = {},
  indicadoresMode = 'full',
  emptyMessage = 'No hay acciones para mostrar. Ajusta los filtros o crea una nueva.',
  emptyActionLabel,
  onEmptyAction,
}: AccionesControlTableProps) {
  const [sortKey, setSortKey] = useState<AccionControlSortKey>(DEFAULT_SORT.key)
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT.dir)
  const { data: priorities = [] } = usePriorities()
  const { data: statuses = [] } = useStatuses()
  const statusByKey = useMemo(() => statusCatalogByKey(statuses), [statuses])

  const handleSortToggle = (key: AccionControlSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const accionesOrdenadas = useMemo(
    () =>
      sortAccionesControl(
        acciones,
        sortKey,
        sortDir,
        responsableNames,
        commentCounts,
        checklistProgressByAccionId,
        indicadoresMode,
        priorities
      ),
    [acciones, sortKey, sortDir, responsableNames, commentCounts, checklistProgressByAccionId, indicadoresMode, priorities]
  )

  if (isLoading) {
    return (
      <>
        <div className="min-h-[200px] space-y-2 px-2 py-2 md:hidden" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[5.5rem] animate-pulse rounded-lg border border-border/40 bg-muted/30" />
          ))}
        </div>
        <div className="hidden min-h-[280px] overflow-hidden rounded-xl md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="bg-muted/40 font-semibold w-[120px]">ID</TableHead>
              <TableHead className="bg-muted/40 font-semibold">Descripción</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[120px]">Estado</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[140px]">Responsable</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[56px]">Pts</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[120px]">Fecha límite</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[90px]">Prioridad</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[100px]">
                {indicadoresMode === 'checklist' ? 'Checklist' : 'Indicadores'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TableRow key={i} className="border-border/40">
                <TableCell className="py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-4 w-48 animate-pulse rounded bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-6 w-20 animate-pulse rounded-full bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-4 w-12 animate-pulse rounded bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-5 w-14 animate-pulse rounded bg-muted/70" /></TableCell>
                <TableCell className="py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted/70" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </>
    )
  }

  if (!acciones.length) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/5 px-4 py-10 text-center sm:min-h-[320px] sm:gap-4 sm:py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
          <ClipboardList className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {emptyMessage}
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Crea una nueva acción o ajusta los filtros para ver resultados.
        </p>
        {emptyActionLabel && onEmptyAction && (
          <Button size="sm" onClick={onEmptyAction} className="mt-1">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {emptyActionLabel}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        id="acciones-control-table-mobile"
        className="acciones-control-table-mobile relative min-h-[120px] overflow-hidden rounded-xl border border-border/50 bg-card md:hidden"
      >
        <AccionesControlMobileList
          acciones={accionesOrdenadas}
          commentCounts={commentCounts}
          responsableNames={responsableNames}
          checklistProgressByAccionId={checklistProgressByAccionId}
          indicadoresMode={indicadoresMode}
          priorities={priorities}
          statusByKey={statusByKey}
          onSelectAccion={onSelectAccion}
        />
      </div>
      <div
        id="acciones-control-table"
        className="acciones-control-table relative hidden min-h-[280px] overflow-auto rounded-xl border border-border/50 bg-card md:block [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80"
      >
      <Table className="acciones-control-table-grid">
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <AccionSortHeader
              columnKey="id"
              label="ID"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[120px]"
            />
            <AccionSortHeader
              columnKey="descripcion"
              label="Descripción"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
            />
            <AccionSortHeader
              columnKey="estado"
              label="Estado"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[120px]"
            />
            <AccionSortHeader
              columnKey="responsable"
              label="Responsable"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[140px]"
            />
            <AccionSortHeader
              columnKey="pts"
              label="Pts"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[56px]"
            />
            <AccionSortHeader
              columnKey="fecha"
              label="Fecha límite"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[120px]"
            />
            <AccionSortHeader
              columnKey="prioridad"
              label="Prioridad"
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[90px]"
            />
            <AccionSortHeader
              columnKey="indicadores"
              label={indicadoresMode === 'checklist' ? 'Checklist' : 'Indicadores'}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggle={handleSortToggle}
              className="w-[100px]"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accionesOrdenadas.map((accion) => {
            const displayStatus = getAccionDisplayEstado(accion)
            const rowBorder = ESTADO_ROW_BORDER[displayStatus] ?? ''
            const priority = findPriorityForAccion(accion, priorities)
            const checklistProg = checklistProgressByAccionId[accion.id]
            return (
              <TableRow
                key={accion.id}
                data-accion-id={accion.id}
                className={cn(
                  'acciones-control-table-row border-border/40 transition-colors',
                  rowBorder,
                  onSelectAccion && 'cursor-pointer hover:bg-muted/40'
                )}
                onClick={() => onSelectAccion?.(accion)}
              >
                <TableCell className="py-3 align-top w-[120px] max-w-[120px]">
                  <AccionIdDisplay id={accion.id} />
                </TableCell>
                <TableCell className="py-3 align-top max-w-[320px]">
                  <p className="truncate font-medium text-foreground" title={accion.descripcion_accion}>
                    {accion.titulo_accion?.trim() || accion.descripcion_accion}
                  </p>
                </TableCell>
                <TableCell className="py-3 align-middle">
                  <Badge
                    variant={
                      displayStatus === 'Retrasa'
                        ? 'destructive'
                        : displayStatus === 'Completada'
                          ? 'default'
                          : 'secondary'
                    }
                    className="font-medium"
                  >
                    {statusCatalogLabel(displayStatus, statusByKey) || accionEstadoLabel(displayStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-muted-foreground text-sm align-middle">
                  {responsableNames[accion.responsable] ?? accion.responsable ?? '—'}
                </TableCell>
                <TableCell className="py-3 text-sm font-semibold tabular-nums text-foreground align-middle">
                  {formatStoryPoints(accion)}
                </TableCell>
                <TableCell className="py-3 text-sm tabular-nums text-foreground align-middle">
                  {formatFechaLimite(accion.fecha)}
                </TableCell>
                <TableCell className="py-3 align-middle">
                  <AccionPriorityBadge
                    prioridad={priority?.nombre ?? accion.prioridad}
                    catalogColor={priority?.color}
                    compact
                    className="max-w-[8rem]"
                  />
                </TableCell>
                <TableCell className="py-3 align-middle">
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-1.5',
                      indicadoresMode === 'checklist' && '[&>*:not(.checklist-only-status)]:hidden'
                    )}
                  >
                    {indicadoresMode === 'checklist' ? (
                      <span className="checklist-only-status">
                        <ChecklistStatusBadge progress={checklistProg} />
                      </span>
                    ) : null}
                    {(commentCounts[accion.id] ?? 0) > 0 && (
                      <span
                        title={`${commentCounts[accion.id]} comentario${commentCounts[accion.id] !== 1 ? 's' : ''}`}
                        className="inline-flex items-center gap-0.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {commentCounts[accion.id]}
                      </span>
                    )}
                    {isEnRetraso(accion) && (
                      <span title="Retrasa: fecha límite vencida" className="text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    {accion.estado === 'En_Pausa' && (
                      <span title="En pausa" className="text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    )}
                    <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} />
                    {accion.tipo_accion === 'desbloqueo' ? (
                      <span
                        title={TIPO_ACCION_CONFIG[accion.tipo_accion].description}
                        className={cn(
                          'inline-flex rounded-md border px-1.5 py-0.5 text-xs font-semibold',
                          TIPO_ACCION_BADGE[accion.tipo_accion]
                        )}
                      >
                        {TIPO_ACCION_CONFIG[accion.tipo_accion].shortLabel}
                      </span>
                    ) : null}
                    {accion.tipo_accion === 'desbloqueo' && accion.responsable_bloqueo ? (
                      <span
                        title="El desbloqueo tiene responsable asignado"
                        className="inline-flex rounded-md bg-muted/80 px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        Desbloqueo
                      </span>
                    ) : null}
                    {checklistProg && checklistProg.total > 0 && (
                      <AccionChecklistProgressBadge
                        completados={checklistProg.completed}
                        total={checklistProg.total}
                      />
                    )}
                    {accion.estado === 'Completada' && !accion.evidencia_cargada && (
                      <span title="Sin evidencia cargada" className="text-amber-600">
                        <FileCheck className="h-4 w-4" />
                      </span>
                    )}
                    {displayStatus !== 'Retrasa' &&
                      displayStatus !== 'Completada' && (
                        <span title="Pendiente de cierre" className="text-muted-foreground">
                          <Clock className="h-4 w-4" />
                        </span>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </>
  )
}
