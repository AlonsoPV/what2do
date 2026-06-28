import type { AccionDiaria, ActionStatus } from '@/types'
import { getAccionKanbanColumn } from './accionUtils'

/** Etiquetas legibles de estado (mismo criterio que kanban y tablero de control). */
export const ACCION_ESTADO_LABELS: Record<ActionStatus, string> = {
  En_Pausa: 'En pausa',
  En_Proceso: 'En proceso',
  Completada: 'Completada',
  Retrasa: 'Retrasa',
}

/** Estado visible: incluye «Retrasa» calculado cuando aplica la fecha límite. */
export function getAccionDisplayEstado(accion: AccionDiaria): ActionStatus {
  return getAccionKanbanColumn(accion)
}

export function accionEstadoLabel(estado: ActionStatus): string {
  return ACCION_ESTADO_LABELS[estado] ?? estado
}

/** Clases de badge alineadas a columnas del kanban. */
export function accionEstadoBadgeClass(estado: ActionStatus): string {
  const map: Record<ActionStatus, string> = {
    En_Pausa: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20',
    En_Proceso: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-1 ring-blue-500/25',
    Completada: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/25',
    Retrasa: 'bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-1 ring-orange-500/25',
  }
  return map[estado] ?? 'bg-muted text-muted-foreground ring-1 ring-border/60'
}
