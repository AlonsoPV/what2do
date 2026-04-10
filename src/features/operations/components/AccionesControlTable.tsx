/**
 * Tabla de control de acciones del día (spec §4.2 AccionesControlTable).
 * Vista cuadrícula optimizada: cabecera fija, bordes por estado, prioridad y indicadores claros.
 */

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
import { AlertCircle, AlertTriangle, Clock, FileCheck, ClipboardList, Plus, MessageSquare } from 'lucide-react'
import { CountdownTimer } from './CountdownTimer'
import { AccionIdDisplay } from './AccionIdDisplay'
import { EvidenciaCargadaIndicator } from './EvidenciaCargadaIndicator'
import { AccionChecklistProgressBadge } from './AccionChecklistProgress'

const ESTADO_LABELS: Record<string, string> = {
  Pendiente: 'Pendiente',
  Hoy: 'Hoy',
  En_Ejecucion: 'En ejecución',
  Bloqueado: 'Bloqueado',
  Retraso: 'Retraso',
  Hecho: 'Hecho',
  Verificado: 'Verificado',
}

const PRIORIDAD_LABELS: Record<string, string> = {
  P1_Critica: 'Crítica',
  P2_Media: 'Media',
  P3_Baja: 'Baja',
}

/** Borde izquierdo sutil por estado para escaneo rápido */
const ESTADO_ROW_BORDER: Record<string, string> = {
  Pendiente: 'border-l-4 border-l-slate-400',
  Hoy: 'border-l-4 border-l-amber-400',
  En_Ejecucion: 'border-l-4 border-l-blue-400',
  Bloqueado: 'border-l-4 border-l-red-400',
  Retraso: 'border-l-4 border-l-orange-500',
  Hecho: 'border-l-4 border-l-emerald-400',
  Verificado: 'border-l-4 border-l-violet-400',
}

const PRIORIDAD_BADGE: Record<string, string> = {
  P1_Critica: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  P2_Media: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  P3_Baja: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
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
  /** Mensaje del empty state (opcional) */
  emptyMessage?: string
  /** Etiqueta del botón CTA en empty state (opcional) */
  emptyActionLabel?: string
  /** Callback al pulsar CTA del empty state (opcional) */
  onEmptyAction?: () => void
}

export function AccionesControlTable({
  acciones,
  isLoading,
  commentCounts = {},
  onSelectAccion,
  responsableNames = {},
  checklistProgressByAccionId = {},
  emptyMessage = 'No hay acciones para mostrar. Ajusta los filtros o crea una nueva.',
  emptyActionLabel,
  onEmptyAction,
}: AccionesControlTableProps) {
  if (isLoading) {
    return (
      <div className="min-h-[280px] overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="bg-muted/40 font-semibold w-[120px]">ID</TableHead>
              <TableHead className="bg-muted/40 font-semibold">Descripción</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[120px]">Estado</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[140px]">Responsable</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[100px]">Hora límite</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[100px]">Temporizador</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[90px]">Prioridad</TableHead>
              <TableHead className="bg-muted/40 font-semibold w-[100px]">Indicadores</TableHead>
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
    )
  }

  if (!acciones.length) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/5 px-4 py-16 text-center">
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
    <div id="acciones-control-table" className="acciones-control-table relative min-h-[280px] overflow-auto rounded-xl border border-border/50 bg-card [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80">
      <Table className="acciones-control-table-grid">
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="sticky top-0 z-10 w-[120px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              ID
            </TableHead>
            <TableHead className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Descripción
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[120px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Estado
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[140px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Responsable
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[100px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Hora límite
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[100px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Temporizador
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[90px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Prioridad
            </TableHead>
            <TableHead className="sticky top-0 z-10 w-[100px] bg-muted/70 backdrop-blur-sm font-semibold text-foreground/90 py-3.5">
              Indicadores
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {acciones.map((accion) => {
            const displayStatus = isEnRetraso(accion) ? 'Retraso' : accion.estado
            const rowBorder = ESTADO_ROW_BORDER[displayStatus] ?? ''
            const prioridadClass = PRIORIDAD_BADGE[accion.prioridad] ?? PRIORIDAD_BADGE.P2_Media
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
                      isEnRetraso(accion)
                        ? 'destructive'
                        : accion.estado === 'Bloqueado'
                          ? 'destructive'
                          : accion.estado === 'Hecho' || accion.estado === 'Verificado'
                            ? 'default'
                            : 'secondary'
                    }
                    className="font-medium"
                  >
                    {ESTADO_LABELS[displayStatus] ?? accion.estado}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-muted-foreground text-sm align-middle">
                  {responsableNames[accion.responsable] ?? accion.responsable ?? '—'}
                </TableCell>
                <TableCell className="py-3 font-mono text-sm tabular-nums text-foreground align-middle">
                  {accion.hora_limite?.slice(0, 5) ?? '—'}
                </TableCell>
                <TableCell className="py-3 align-middle">
                  <CountdownTimer
                    fecha={accion.fecha}
                    hora_limite={accion.hora_limite ?? '23:59'}
                    estado={accion.estado}
                    variant="compact"
                  />
                </TableCell>
                <TableCell className="py-3 align-middle">
                  <span
                    className={cn(
                      'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                      prioridadClass
                    )}
                  >
                    {PRIORIDAD_LABELS[accion.prioridad] ?? accion.prioridad}
                  </span>
                </TableCell>
                <TableCell className="py-3 align-middle">
                  <div className="flex flex-wrap items-center gap-1.5">
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
                      <span title="Retraso: fecha límite vencida" className="text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    {accion.estado === 'Bloqueado' && (
                      <span title="Bloqueado" className="text-destructive">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    )}
                    <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} />
                    {checklistProg && checklistProg.total > 0 && (
                      <AccionChecklistProgressBadge
                        completados={checklistProg.completed}
                        total={checklistProg.total}
                      />
                    )}
                    {!accion.evidencia_cargada &&
                      (accion.estado === 'Hecho' || accion.estado === 'Verificado') && (
                      <span title="Sin evidencia cargada" className="text-amber-600">
                        <FileCheck className="h-4 w-4" />
                      </span>
                    )}
                    {!isEnRetraso(accion) &&
                      accion.estado !== 'Hecho' &&
                      accion.estado !== 'Verificado' &&
                      accion.estado !== 'Bloqueado' && (
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
  )
}
