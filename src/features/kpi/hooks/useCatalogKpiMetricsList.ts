import { useMemo } from 'react'
import type { CatalogKpiMeasurement, CatalogKpiO2cRow } from '../types/kpi.types'
import {
  computeCatalogKpiMetricItem,
  type CatalogKpiMetricComputed,
  type CatalogObservationPolicy,
  DEFAULT_O2C_TARGET_HORIZON,
  type TargetHorizon,
} from '../utils/kpiCalculations'

/** Alias del tipo unificado en `kpiCalculations` (misma forma que `CatalogKpiMetricComputed`). */
export type CatalogKpiMetricItem = CatalogKpiMetricComputed

export type UseCatalogKpiMetricsListOptions = {
  /** Meta efectiva por defecto M18 (ver `resolveTarget`). */
  targetHorizon?: TargetHorizon
  /** Por defecto `measurement_only`: sin usar baseline como valor observado ficticio para el score. */
  observationPolicy?: CatalogObservationPolicy
}

/**
 * Lista de KPIs con métrica, cumplimiento y semáforo a partir de últimas mediciones por id.
 * Compartido por el tablero KPIs y el score global del dashboard.
 */
export function useCatalogKpiMetricsList(
  kpiRows: CatalogKpiO2cRow[],
  latestById: Map<string, CatalogKpiMeasurement> | undefined,
  options?: UseCatalogKpiMetricsListOptions
) {
  const horizon = options?.targetHorizon ?? DEFAULT_O2C_TARGET_HORIZON
  const observationPolicy = options?.observationPolicy ?? 'measurement_only'

  return useMemo((): CatalogKpiMetricItem[] => {
    const map = latestById ?? new Map<string, CatalogKpiMeasurement>()
    return kpiRows.map((row) =>
      computeCatalogKpiMetricItem(row, map.get(row.id), {
        targetHorizon: horizon,
        observationPolicy,
      })
    )
  }, [kpiRows, latestById, horizon, observationPolicy])
}
