import { useMemo } from 'react'
import type { CatalogKpiMetricItem } from './useCatalogKpiMetricsList'
import {
  DEFAULT_O2C_TARGET_HORIZON,
  deriveGlobalPortfolioFromMetricItems,
  type GlobalPortfolioDerived,
  type TargetHorizon,
} from '../utils/kpiCalculations'

/**
 * Score global O2C, desglose y diagnóstico de pesos a partir de la lista ya resuelta por
 * `useCatalogKpiMetricsList` (misma fuente que el dashboard ejecutivo vía `useO2cGlobalScore`).
 */
export function useCatalogKpiGlobalPortfolioDerived(
  metricItems: CatalogKpiMetricItem[],
  targetHorizon: TargetHorizon = DEFAULT_O2C_TARGET_HORIZON
): GlobalPortfolioDerived {
  return useMemo(
    () => deriveGlobalPortfolioFromMetricItems(metricItems, { targetHorizon }),
    [metricItems, targetHorizon]
  )
}
