/**
 * Feature: Operaciones (spec §5.2, §5.3)
 * Acciones diarias: tabla de control, Kanban, crear/editar, evidencia, estados.
 */

export { useAcciones, useAccionesByDate, useAccion, useCommentCounts } from './hooks'
export {
  useCreateAccion,
  useUpdateAccion,
  useUpdateAccionEstado,
  useDeleteAccion,
  useAccionCheckpoints,
  useChecklistProgressByAccionIds,
  useCheckpointsPendingByAccionIds,
  useInsertAccionCheckpoint,
  useDeleteAccionCheckpoint,
  useUpdateAccionCheckpoint,
  useToggleAccionCheckpoint,
  ACCION_CHECKPOINTS_KEY,
} from './hooks'
export { AccionIdDisplay } from './components/AccionIdDisplay'
export { EvidenciaCargadaIndicator } from './components/EvidenciaCargadaIndicator'
export { AccionesControlTable } from './components/AccionesControlTable'
export { AccionesFilterBar } from './components/AccionesFilterBar'
export { AccionForm } from './components/AccionForm'
export { AccionFormDialog } from './components/AccionFormDialog'
export { AccionChecklistEditor, type LocalCheckpointDraft } from './components/AccionChecklistEditor'
export { AccionChecklistManage } from './components/AccionChecklistManage'
export { AccionChecklistProgress, AccionChecklistProgressBadge } from './components/AccionChecklistProgress'
export { MSJ_HECHO_CHECKPOINTS_PENDIENTES } from './constants/checkpoints'
export { KanbanBoard } from './components/KanbanBoard'
export {
  canChangeAccionEstado,
  canMoveToHecho,
  canMoveToVerificado,
  getAccionEstadoChangeDenialMessage,
  MSJ_PERMISO_HECHO,
  MSJ_PERMISO_VERIFICADO,
} from './utils/actionPermissions'
export { useActionEstadoPermissions } from './hooks/useActionEstadoPermissions'
export { KanbanHeader } from './components/KanbanHeader'
export { KanbanToolbar } from './components/KanbanToolbar'
export type { KanbanToolbarLayout } from './components/KanbanToolbar'
export { CountdownTimer } from './components/CountdownTimer'
export { metricasFromAcciones, type MetricasAcciones } from './utils/metricas'
export type { AccionCreateInput, AccionFormInput, AccionUpdateInput } from './schemas/accion.schema'
export type { KanbanViewMode } from './components/KanbanHeader'
