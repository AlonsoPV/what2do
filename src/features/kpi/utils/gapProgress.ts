import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types/enums'

export function accionStoryPoints(a: AccionDiaria): number {
  const sp = a.story_points
  return typeof sp === 'number' && Number.isFinite(sp) ? Math.max(0, sp) : 0
}

export function isAccionEstadoDone(estado: ActionStatus): boolean {
  return estado === 'Completada'
}

/**
 * Progreso por story points: suma en Hecho/Verificado vs total.
 * Si ninguna acción aporta SP, usa `totalStoryPointsFallback` (cache en `gaps`) como denominador.
 * @param junctionAccionIdsForGap acciones vinculadas por tabla `accion_gaps` (además de `a.gap_id === gapId`).
 */
export function computeGapStoryProgress(
  gapId: string,
  acciones: AccionDiaria[],
  totalStoryPointsFallback: number,
  junctionAccionIdsForGap?: Set<string>
): { donePoints: number; totalPoints: number } {
  const forGap = acciones.filter(
    (a) => a.gap_id === gapId || (junctionAccionIdsForGap?.has(a.id) ?? false)
  )
  let total = 0
  let donePoints = 0
  for (const a of forGap) {
    const sp = accionStoryPoints(a)
    total += sp
    if (isAccionEstadoDone(a.estado)) donePoints += sp
  }
  if (total === 0 && totalStoryPointsFallback > 0) {
    total = totalStoryPointsFallback
  }
  return { donePoints, totalPoints: total }
}
