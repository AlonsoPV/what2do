import { useCatalogKpiO2cPortfolioPipeline } from './useCatalogKpiO2cPortfolioPipeline'
import type { CatalogKpiMetricItem } from './useCatalogKpiMetricsList'
import type { CatalogKpiO2cRow } from '../types/kpi.types'
import type { GlobalPortfolioDerived, TargetHorizon } from '../utils/kpiCalculations'
import { DEFAULT_O2C_TARGET_HORIZON } from '../utils/kpiCalculations'

export type UseO2cGlobalScoreOptions = {
  targetHorizon?: TargetHorizon
}

export type UseO2cGlobalScoreResult = Pick<
  GlobalPortfolioDerived,
  'globalScore' | 'portfolioBreakdown' | 'weightSum' | 'weightWarning' | 'portfolioMetricItems' | 'coverage'
> & {
  isLoading: boolean
  targetHorizon: TargetHorizon
  /** Todas las filas O2C con métrica (sin filtrar `in_global_portfolio`). */
  metricItems: CatalogKpiMetricItem[]
  kpiRows: CatalogKpiO2cRow[]
}

/**
 * Score global O2C y desglose (KPIs en portafolio global con gap y activos).
 * Misma implementación que `useCatalogKpiO2cPortfolioPipeline({ activo: true })` — un solo camino de cálculo.
 */
export function useO2cGlobalScore(options?: UseO2cGlobalScoreOptions): UseO2cGlobalScoreResult {
  const targetHorizon = options?.targetHorizon ?? DEFAULT_O2C_TARGET_HORIZON

  const pipeline = useCatalogKpiO2cPortfolioPipeline({
    activo: true,
    targetHorizon,
  })

  const {
    globalScore,
    portfolioBreakdown,
    portfolioMetricItems,
    weightSum,
    weightWarning,
    coverage,
    metricItems,
    kpiRows,
    isLoading,
  } = pipeline

  return {
    globalScore,
    portfolioBreakdown,
    portfolioMetricItems,
    weightSum,
    weightWarning,
    coverage,
    metricItems,
    kpiRows,
    isLoading,
    targetHorizon: pipeline.targetHorizon,
  }
}
