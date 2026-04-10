import { useCatalogKpiGlobalPortfolioDerived } from './useCatalogKpiGlobalPortfolioDerived'
import { useCatalogKpiO2cMetricItems } from './useCatalogKpiO2cMetricItems'
import type { CatalogKpiMeasurement, CatalogKpiO2cRow, CatalogKpisO2cListOpts } from '../types/kpi.types'
import {
  DEFAULT_O2C_TARGET_HORIZON,
  type GlobalPortfolioDerived,
  type TargetHorizon,
} from '../utils/kpiCalculations'
import type { CatalogKpiMetricItem } from './useCatalogKpiMetricsList'

export type UseCatalogKpiO2cPortfolioPipelineOptions = CatalogKpisO2cListOpts & {
  /** Meta efectiva (M6/M12/M18); por defecto M18. */
  targetHorizon?: TargetHorizon
  enabled?: boolean
}

export type CatalogKpiO2cPortfolioPipelineResult = GlobalPortfolioDerived & {
  metricItems: CatalogKpiMetricItem[]
  kpiRows: CatalogKpiO2cRow[]
  recentById: Map<string, CatalogKpiMeasurement[]>
  isLoading: boolean
  targetHorizon: TargetHorizon
}

/**
 * Pipeline único: KPIs O2C → últimas mediciones → cumplimiento/status → score global del portafolio.
 * Usar en `useO2cGlobalScore`, `KpisDashboardPage` y cualquier vista que necesite la misma semántica.
 */
export function useCatalogKpiO2cPortfolioPipeline(
  options: UseCatalogKpiO2cPortfolioPipelineOptions = {}
): CatalogKpiO2cPortfolioPipelineResult {
  const { targetHorizon = DEFAULT_O2C_TARGET_HORIZON, enabled = true, ...listOpts } = options

  const { metricItems, kpiRows, recentById, isLoading, targetHorizon: horizon } = useCatalogKpiO2cMetricItems({
    ...listOpts,
    targetHorizon,
    enabled,
  })

  const derived = useCatalogKpiGlobalPortfolioDerived(metricItems, horizon)

  return {
    ...derived,
    metricItems,
    kpiRows,
    recentById,
    isLoading,
    targetHorizon: horizon,
  }
}
