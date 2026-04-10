import type { CatalogKpi } from '../types/catalogs.types'
import { GLOBAL_PORTFOLIO_WEIGHT_TOLERANCE } from '@/features/kpi/utils/kpiCalculations'

export type PortfolioWeightPatch = {
  id?: string
  weight: number | null
  activo: boolean
  gap_id: string | null
  in_global_portfolio: boolean
}

/**
 * Suma de pesos del portafolio global tras aplicar un alta/edición (misma regla que el trigger BD).
 */
export function computeGlobalPortfolioWeightSumAfterSave(
  all: CatalogKpi[],
  next: PortfolioWeightPatch
): number {
  let sum = 0
  for (const r of all) {
    if (next.id && r.id === next.id) continue
    if (r.activo && r.gap_id && r.in_global_portfolio) {
      const w = r.weight
      if (typeof w === 'number' && Number.isFinite(w)) sum += w
    }
  }
  if (next.activo && next.gap_id && next.in_global_portfolio) {
    const w = next.weight
    if (typeof w === 'number' && Number.isFinite(w)) sum += w
  }
  return sum
}

export function globalPortfolioWeightSumMessage(sum: number, hasAnyInPortfolio: boolean): string | null {
  if (!hasAnyInPortfolio) return null
  if (Math.abs(sum - 1) > GLOBAL_PORTFOLIO_WEIGHT_TOLERANCE) {
    return `La suma de pesos del portafolio global es ${sum.toFixed(4)} (debe ser 1.0). Ajusta pesos o desmarca «Incluir en portafolio global».`
  }
  return null
}
