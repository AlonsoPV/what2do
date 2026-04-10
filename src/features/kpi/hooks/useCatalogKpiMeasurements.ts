import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  getLatestMeasurement,
  listLatestMeasurementsForCatalogKpiIds,
  listMeasurementsByCatalogKpiId,
  listRecentMeasurementsPerKpi,
} from '../services/catalogKpiMeasurements.service'
import type { MeasurementsListOpts } from '../services/catalogKpiMeasurements.service'
import { KPI_STALE_TIME_MEASUREMENTS_MS, kpiQueryKeys } from '../kpiQueryKeys'

export type UseCatalogKpiMeasurementsOptions = MeasurementsListOpts & {
  enabled?: boolean
}

/**
 * Historial de mediciones O2C para un `catalog_kpis.id` (más reciente primero).
 */
export function useCatalogKpiMeasurements(
  catalogKpiId: string | undefined | null,
  options: UseCatalogKpiMeasurementsOptions = {}
) {
  const { enabled = true, limit } = options
  const id = catalogKpiId ?? ''
  return useQuery({
    queryKey: [...kpiQueryKeys.catalogKpiMeasurements(id || 'none'), { limit }] as const,
    queryFn: () => listMeasurementsByCatalogKpiId(catalogKpiId!, { limit }),
    enabled: Boolean(catalogKpiId) && enabled,
    staleTime: KPI_STALE_TIME_MEASUREMENTS_MS,
  })
}

/**
 * Solo la última medición (clave distinta para no mezclar con el historial completo).
 */
export function useCatalogKpiLatestMeasurement(catalogKpiId: string | undefined | null) {
  return useQuery({
    queryKey: [...kpiQueryKeys.catalogKpiMeasurements(catalogKpiId || 'none'), 'latest'] as const,
    queryFn: () => getLatestMeasurement(catalogKpiId!),
    enabled: Boolean(catalogKpiId),
    staleTime: KPI_STALE_TIME_MEASUREMENTS_MS,
  })
}

function sortedIdsKey(ids: string[]): string {
  return [...new Set(ids)].filter(Boolean).sort().join(',')
}

/**
 * Última medición por cada id (tablero KPIs; evita N queries).
 */
export function useCatalogKpiLatestMeasurementsBatch(catalogKpiIds: string[] | undefined) {
  const stableKey = useMemo(() => sortedIdsKey(catalogKpiIds ?? []), [catalogKpiIds])
  const ids = useMemo(() => [...new Set(catalogKpiIds ?? [])].filter(Boolean), [catalogKpiIds])

  return useQuery({
    queryKey: kpiQueryKeys.catalogKpiMeasurementsLatestBatch(stableKey),
    queryFn: () => listLatestMeasurementsForCatalogKpiIds(ids),
    enabled: ids.length > 0,
    staleTime: KPI_STALE_TIME_MEASUREMENTS_MS,
  })
}

/**
 * Hasta dos mediciones recientes por KPI (tendencia vs anterior).
 */
export function useCatalogKpiRecentMeasurementsBatch(catalogKpiIds: string[] | undefined, perKpiLimit = 2) {
  const stableKey = useMemo(() => sortedIdsKey(catalogKpiIds ?? []), [catalogKpiIds])
  const ids = useMemo(() => [...new Set(catalogKpiIds ?? [])].filter(Boolean), [catalogKpiIds])

  return useQuery({
    queryKey: kpiQueryKeys.catalogKpiMeasurementsRecentBatch(stableKey, perKpiLimit),
    queryFn: () => listRecentMeasurementsPerKpi(ids, perKpiLimit),
    enabled: ids.length > 0,
    staleTime: KPI_STALE_TIME_MEASUREMENTS_MS,
  })
}
