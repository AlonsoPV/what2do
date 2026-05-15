/**
 * API con nombres alineados al documento maestro O2C.
 * La implementación numérica vive en `kpiCalculations.ts` (`catalog_kpis` + mediciones).
 */

export type { CatalogObservationPolicy } from './kpiCalculations'
export {
  calculateCompliance as calculateKpiCompliance,
  calculateGlobalScore,
  calculateWeightedScore,
  getGapWeight,
  getKpiStatus,
  resolveTarget as getActiveTarget,
  sumWeightedComplianceParts,
} from './kpiCalculations'

/**
 * Pesos renormalizados entre KPIs con cumplimiento elegible (misma semántica que el denominador del score global).
 * Devuelve vector paralelo al input: 0 donde no hubo peso elegible.
 */
export function normalizeKpiWeightsForEligible(
  items: Array<{ weight: number | null; compliance: number | null }>
): number[] {
  const raw = items.map((it) => {
    const w = it.weight
    const c = it.compliance
    if (c == null || !Number.isFinite(c)) return 0
    if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) return 0
    return w
  })
  const sum = raw.reduce((s, w) => s + w, 0)
  if (sum <= 0) return raw.map(() => 0)
  return raw.map((w) => (w > 0 ? w / sum : 0))
}
