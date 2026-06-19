/**
 * Validación centralizada antes de pasar una acción a estado Hecho (cliente).
 * Debe usarse desde hooks/servicios que actualicen `estado` a 'Hecho'.
 * La BD mantiene trigger de checkpoints como red de seguridad.
 */

import { accionesService } from '@/services/acciones.service'
import { accionCheckpointsService } from '@/services/accionCheckpoints.service'
import { MSJ_HECHO_CHECKPOINTS_PENDIENTES } from '@/features/operations/constants/checkpoints'
import { supabase } from '@/lib/supabase/client'
import type { AccionDiaria } from '@/types'

export type CloseAccionValidationOptions = {
  /**
   * Fase 2: si es true, solo checkpoints `obligatorio = true` activos e incompletos bloquean Hecho.
   * Hoy debe omitirse o ser false para conservar la regla actual (todos los activos bloquean).
   */
  onlyObligatorioBlocking?: boolean
}

const MSJ_HECHO_SIN_EVIDENCIA = 'No se puede marcar como Hecho sin evidencia cargada.'

function normalizeEvidenceRule(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function accionRequiresEvidence(accion: Pick<AccionDiaria, 'evidencia_esperada'>): boolean {
  const normalized = normalizeEvidenceRule(accion.evidencia_esperada)
  if (!normalized) return false
  return ![
    'opcional',
    'no aplica',
    'n/a',
    'na',
    'sin evidencia',
    'sin evidencia requerida',
    'no requiere evidencia',
  ].includes(normalized)
}

async function hasEvidenceRecord(accionId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('accion_evidencias')
    .select('id', { count: 'exact', head: true })
    .eq('accion_id', accionId)
  if (error) throw error
  return (count ?? 0) > 0
}

/**
 * Lanza Error con mensaje localizado si no se puede cerrar.
 */
export async function assertCanCloseAccionFromAccion(
  accion: AccionDiaria,
  options?: CloseAccionValidationOptions
): Promise<void> {
  if (accionRequiresEvidence(accion) && !accion.evidencia_cargada) {
    const hasRecord = await hasEvidenceRecord(accion.id)
    if (!hasRecord) throw new Error(MSJ_HECHO_SIN_EVIDENCIA)
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
