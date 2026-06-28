/**
 * Permisos para cambiar el estado de una acción diaria.
 * IDs de negocio: usuarios.id (created_by, responsable), no auth.users.id.
 */

import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types'

/** Mensaje si no puede pasar a Completada (UI + alineado con validación servidor). */
export const MSJ_PERMISO_COMPLETADA =
  'Solo la persona creadora de la acción o el responsable asignado pueden marcar esta acción como Completada.'

/** @deprecated Alias legacy */
export const MSJ_PERMISO_HECHO = MSJ_PERMISO_COMPLETADA

/** Mensaje si no es responsable, creador ni admin de negocio (alineado con RLS de UPDATE). */
export const MSJ_PERMISO_CAMBIAR_ESTADO =
  'Solo el responsable, quien creó la acción o un administrador pueden cambiar su estatus.'

export function isEstadoConPermisoEstricto(estado: ActionStatus): boolean {
  return estado === 'Completada'
}

/**
 * Puede mover a Completada: creador (si hay created_by) o responsable.
 * Si created_by es null, solo el responsable puede cerrar operativamente.
 */
export function canMoveToCompletada(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined
): boolean {
  if (!currentUsuarioId) return false
  if (accion.responsable === currentUsuarioId) return true
  if (accion.created_by != null && accion.created_by === currentUsuarioId) return true
  return false
}

/** @deprecated Usar canMoveToCompletada */
export const canMoveToHecho = canMoveToCompletada

/** @deprecated Usar canMoveToCompletada */
export const canMoveToVerificado = canMoveToCompletada

/** @deprecated Usar MSJ_PERMISO_COMPLETADA */
export const MSJ_PERMISO_VERIFICADO = MSJ_PERMISO_COMPLETADA

/** Puede editar la acción (incluido cambiar estatus), según RLS de acciones_diarias. */
export function canManageAccionEstado(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined,
  options?: { bypassEstadoRoles?: boolean }
): boolean {
  if (options?.bypassEstadoRoles) return true
  if (!currentUsuarioId) return false
  if (accion.responsable === currentUsuarioId) return true
  if (accion.created_by != null && accion.created_by === currentUsuarioId) return true
  return false
}

/**
 * Indica si el usuario puede llevar la acción al estado indicado.
 * `bypassEstadoRoles`: p.ej. DG/Sistemas (isAdminByRole); debe coincidir con políticas de producto.
 */
export function canChangeAccionEstado(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined,
  targetEstado: ActionStatus,
  options?: { bypassEstadoRoles?: boolean }
): boolean {
  if (options?.bypassEstadoRoles) return true
  if (!canManageAccionEstado(accion, currentUsuarioId, options)) return false
  if (targetEstado === 'Completada') return canMoveToCompletada(accion, currentUsuarioId)
  return true
}

/** Mensaje de denegación; null si está permitido. */
export function getAccionEstadoChangeDenialMessage(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined,
  targetEstado: ActionStatus,
  options?: { bypassEstadoRoles?: boolean }
): string | null {
  if (options?.bypassEstadoRoles) return null
  if (!canManageAccionEstado(accion, currentUsuarioId, options)) {
    return MSJ_PERMISO_CAMBIAR_ESTADO
  }
  if (targetEstado === 'Completada' && !canMoveToCompletada(accion, currentUsuarioId)) {
    return MSJ_PERMISO_COMPLETADA
  }
  return null
}
