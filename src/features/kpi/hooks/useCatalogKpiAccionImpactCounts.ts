import { useQuery } from '@tanstack/react-query'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '../kpiQueryKeys'
import { fetchCatalogKpiAccionImpactCounts } from '../services/catalogKpiAccionImpact.service'

export type UseCatalogKpiAccionImpactCountsOptions = {
  enabled?: boolean
}

/**
 * Mapa catalog_kpi_id → cantidad de acciones que lo impactan (puente + columna primaria).
 */
export function useCatalogKpiAccionImpactCounts(
  options?: UseCatalogKpiAccionImpactCountsOptions
) {
  const enabled = options?.enabled ?? true
  return useQuery({
    queryKey: kpiQueryKeys.catalogKpiAccionImpact,
    queryFn: fetchCatalogKpiAccionImpactCounts,
    staleTime: KPI_STALE_TIME_LIST_MS,
    enabled,
  })
}
