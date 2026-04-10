import { useQuery } from '@tanstack/react-query'
import { getCatalogKpiO2cById, listCatalogKpisO2c } from '../services/catalogKpisO2c.service'
import type { CatalogKpisO2cListOpts } from '../types/kpi.types'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '../kpiQueryKeys'

export type UseWeightedKpisOptions = CatalogKpisO2cListOpts & {
  enabled?: boolean
}

function listOptsSignature(opts: CatalogKpisO2cListOpts): string {
  return JSON.stringify(opts)
}

/**
 * KPIs de catálogo con columnas O2C (pesos, baseline, gap).
 * - Sin `gapId`: lista global (misma clave base `catalog-kpis`).
 * - Con `gapId`: solo KPIs de ese gap (`catalog-kpis` + id).
 */
export function useWeightedKpis(options: UseWeightedKpisOptions = {}) {
  const { enabled = true, ...listOpts } = options
  const gapId = listOpts.gapId
  const baseKey =
    gapId !== undefined && gapId !== null && gapId !== ''
      ? kpiQueryKeys.catalogKpisByGap(gapId)
      : kpiQueryKeys.catalogKpis
  return useQuery({
    queryKey: [...baseKey, listOptsSignature(listOpts)] as const,
    queryFn: () => listCatalogKpisO2c(listOpts),
    enabled,
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}

/**
 * Un KPI de catálogo O2C por id (detalle / invalidación puntual).
 */
export function useWeightedKpiById(catalogKpiId: string | undefined | null) {
  return useQuery({
    queryKey: catalogKpiId ? [...kpiQueryKeys.catalogKpis, 'byId', catalogKpiId] as const : ['catalog-kpis', 'none'],
    queryFn: () => getCatalogKpiO2cById(catalogKpiId!),
    enabled: Boolean(catalogKpiId),
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}
