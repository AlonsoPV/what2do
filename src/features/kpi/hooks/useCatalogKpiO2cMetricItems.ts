import { useMemo } from 'react'
import { useCatalogKpiRecentMeasurementsBatch } from './useCatalogKpiMeasurements'
import { useCatalogKpiMetricsList, type CatalogKpiMetricItem } from './useCatalogKpiMetricsList'
import { useWeightedKpis } from './useWeightedKpis'
import type { CatalogKpiMeasurement, CatalogKpiO2cRow, CatalogKpisO2cListOpts } from '../types/kpi.types'
import { DEFAULT_O2C_TARGET_HORIZON, type TargetHorizon } from '../utils/kpiCalculations'

export type UseCatalogKpiO2cMetricItemsOptions = CatalogKpisO2cListOpts & {
  targetHorizon?: TargetHorizon
  enabled?: boolean
}

export type CatalogKpiO2cMetricItemsResult = {
  metricItems: CatalogKpiMetricItem[]
  kpiRows: CatalogKpiO2cRow[]
  recentById: Map<string, CatalogKpiMeasurement[]>
  isLoading: boolean
  targetHorizon: TargetHorizon
}

/**
 * KPIs O2C + últimas mediciones + cumplimiento/status por fila (sin filtrar portafolio global).
 * Base compartida para `useCatalogKpiO2cPortfolioPipeline` y pantallas que necesitan la misma lista
 * sin el agregado de score global.
 */
export function useCatalogKpiO2cMetricItems(
  options: UseCatalogKpiO2cMetricItemsOptions = {}
): CatalogKpiO2cMetricItemsResult {
  const { targetHorizon = DEFAULT_O2C_TARGET_HORIZON, enabled = true, ...listOpts } = options

  const { data: kpiRows = [], isLoading: kpisLoading } = useWeightedKpis({
    ...listOpts,
    enabled,
  })

  const kpiIds = useMemo(() => kpiRows.map((r) => r.id), [kpiRows])

  const { data: recentById, isLoading: measLoading } = useCatalogKpiRecentMeasurementsBatch(
    enabled ? kpiIds : undefined
  )
  const latestById = useMemo(() => {
    const out = new Map<string, CatalogKpiMeasurement>()
    const recent = recentById ?? new Map<string, CatalogKpiMeasurement[]>()
    for (const [kpiId, rows] of recent.entries()) {
      const latest = rows[0]
      if (latest) out.set(kpiId, latest)
    }
    return out
  }, [recentById])

  const metricItems = useCatalogKpiMetricsList(kpiRows, latestById, { targetHorizon })

  const isLoading = kpisLoading || measLoading

  return {
    metricItems,
    kpiRows,
    recentById: recentById ?? new Map<string, CatalogKpiMeasurement[]>(),
    isLoading,
    targetHorizon,
  }
}
