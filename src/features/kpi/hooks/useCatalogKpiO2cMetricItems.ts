import { useMemo } from 'react'
import { useCatalogKpiRecentMeasurementsBatch } from './useCatalogKpiMeasurements'
import { useCatalogKpiMetricsList, type CatalogKpiMetricItem } from './useCatalogKpiMetricsList'
import { useWeightedKpis } from './useWeightedKpis'
import type { CatalogKpiMeasurement, CatalogKpiO2cRow, CatalogKpisO2cListOpts } from '../types/kpi.types'
import {
  DEFAULT_O2C_TARGET_HORIZON,
  type CatalogObservationPolicy,
  type TargetHorizon,
} from '../utils/kpiCalculations'

const EMPTY_RECENT_MEASUREMENTS_MAP = new Map<string, CatalogKpiMeasurement[]>()

export type UseCatalogKpiO2cMetricItemsOptions = CatalogKpisO2cListOpts & {
  targetHorizon?: TargetHorizon
  observationPolicy?: CatalogObservationPolicy
  enabled?: boolean
}

export type CatalogKpiO2cMetricItemsResult = {
  metricItems: CatalogKpiMetricItem[]
  kpiRows: CatalogKpiO2cRow[]
  recentById: Map<string, CatalogKpiMeasurement[]>
  isLoading: boolean
  isError: boolean
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
  const {
    targetHorizon = DEFAULT_O2C_TARGET_HORIZON,
    observationPolicy = 'measurement_only',
    enabled = true,
    ...listOpts
  } = options

  const { data: kpiRows = [], isLoading: kpisLoading, isError: kpisError } = useWeightedKpis({
    ...listOpts,
    enabled,
  })

  const kpiIds = useMemo(() => kpiRows.map((r) => r.id), [kpiRows])

  const {
    data: recentMeasurementsRaw,
    isLoading: measLoading,
    isError: measError,
  } = useCatalogKpiRecentMeasurementsBatch(
    enabled ? kpiIds : undefined
  )

  const recentById = useMemo(
    () => recentMeasurementsRaw ?? EMPTY_RECENT_MEASUREMENTS_MAP,
    [recentMeasurementsRaw]
  )

  const latestById = useMemo(() => {
    const out = new Map<string, CatalogKpiMeasurement>()
    for (const [kpiId, rows] of recentById.entries()) {
      const latest = rows[0]
      if (latest) out.set(kpiId, latest)
    }
    return out
  }, [recentById])

  const metricItems = useCatalogKpiMetricsList(kpiRows, latestById, {
    targetHorizon,
    observationPolicy,
  })

  const isLoading = kpisLoading || measLoading
  const isError = kpisError || measError

  return {
    metricItems,
    kpiRows,
    recentById,
    isLoading,
    isError,
    targetHorizon,
  }
}
