/**
 * Permisos para cambiar el estado de una acción diaria.
 * IDs de negocio: usuarios.id (created_by, responsable), no auth.users.id.
 */

import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types'

/** Mensaje si no puede pasar a Hecho (UI + alineado con validación servidor). */
export const MSJ_PERMISO_HECHO =
  'Solo la persona creadora de la acción o el responsable asignado pueden marcar esta acción como Hecha.'

/** Mensaje si no puede pasar a Verificado. */
export const MSJ_PERMISO_VERIFICADO =
  'Solo la persona que creó esta acción puede marcarla como Verificada.'

export function isEstadoConPermisoEstricto(estado: ActionStatus): boolean {
  return estado === 'Hecho' || estado === 'Verificado'
}

/**
 * Puede mover a Hecho: creador (si hay created_by) o responsable.
 * Si created_by es null, solo el responsable puede cerrar operativamente.
 */
export function canMoveToHecho(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined
): boolean {
  if (!currentUsuarioId) return false
  if (accion.responsable === currentUsuarioId) return true
  if (accion.created_by != null && accion.created_by === currentUsuarioId) return true
  return false
}

/** Puede mover a Verificado: solo creador; requiere created_by no nulo. */
export function canMoveToVerificado(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined
): boolean {
  if (!currentUsuarioId || accion.created_by == null) return false
  return accion.created_by === currentUsuarioId
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
  if (targetEstado === 'Hecho') return canMoveToHecho(accion, currentUsuarioId)
  if (targetEstado === 'Verificado') return canMoveToVerificado(accion, currentUsuarioId)
  return true
}

/** Mensaje de denegación para Hecho/Verificado; null si está permitido o el estado no aplica esta regla. */
export function getAccionEstadoChangeDenialMessage(
  accion: AccionDiaria,
  currentUsuarioId: string | null | undefined,
  targetEstado: ActionStatus,
  options?: { bypassEstadoRoles?: boolean }
): string | null {
  if (options?.bypassEstadoRoles) return null
  if (targetEstado === 'Hecho' && !canMoveToHecho(accion, currentUsuarioId)) {
    return MSJ_PERMISO_HECHO
  }
  if (targetEstado === 'Verificado' && !canMoveToVerificado(accion, currentUsuarioId)) {
    return MSJ_PERMISO_VERIFICADO
  }
  return null
}
