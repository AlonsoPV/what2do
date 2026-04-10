/**
 * Validación centralizada antes de pasar una acción a estado Hecho (cliente).
 * Debe usarse desde hooks/servicios que actualicen `estado` a 'Hecho'.
 * La BD mantiene trigger como red de seguridad.
 */

import { accionesService } from '@/services/acciones.service'
import { accionCheckpointsService } from '@/services/accionCheckpoints.service'
import {
  MSJ_HECHO_CHECKPOINTS_PENDIENTES,
  MSJ_HECHO_EVIDENCIA_REQUERIDA,
} from '@/features/operations/constants/checkpoints'
import type { AccionDiaria } from '@/types'

export type CloseAccionValidationOptions = {
  /**
   * Fase 2: si es true, solo checkpoints `obligatorio = true` activos e incompletos bloquean Hecho.
   * Hoy debe omitirse o ser false para conservar la regla actual (todos los activos bloquean).
   */
  onlyObligatorioBlocking?: boolean
}

/**
 * Lanza Error con mensaje localizado si no se puede cerrar.
 */
export async function assertCanCloseAccionFromAccion(
  accion: AccionDiaria,
  options?: CloseAccionValidationOptions
): Promise<void> {
  if (!accion.evidencia_cargada) {
    throw new Error(MSJ_HECHO_EVIDENCIA_REQUERIDA)
  }
  const bloquea = await accionCheckpointsService.hasPendingBlockingHecho(accion.id, {
    onlyObligatorio: options?.onlyObligatorioBlocking === true,
  })
  if (bloquea) {
    throw new Error(MSJ_HECHO_CHECKPOINTS_PENDIENTES)
  }
}

export async function assertCanCloseAccion(
  accionId: string,
  options?: CloseAccionValidationOptions
): Promise<void> {
  const accion = await accionesService.getById(accionId)
  await assertCanCloseAccionFromAccion(accion, options)
}
