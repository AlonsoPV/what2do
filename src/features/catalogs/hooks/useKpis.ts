import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '@/features/kpi/kpiQueryKeys'
import { catalogKpisService } from '../services/kpis.service'
import type { CatalogFilter } from '../types/catalogs.types'
import type { CreateKpiInput, UpdateKpiInput } from '../types/catalogs.types'

const KEY = ['catalogs', 'kpis'] as const

function serializeKpiFilter(filter: CatalogFilter): string {
  return JSON.stringify({
    search: filter.search ?? '',
    activo: filter.activo ?? null,
    gap_id: filter.gap_id ?? null,
    calc_type: filter.calc_type ?? null,
    globalPortfolioMembersOnly: filter.globalPortfolioMembersOnly ?? false,
  })
}

function invalidateKpiCatalogQueries(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: KEY })
  qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpis })
}

export function useKpis(filter: CatalogFilter = {}) {
  return useQuery({
    queryKey: [...KEY, serializeKpiFilter(filter)],
    queryFn: () => catalogKpisService.list(filter),
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}

export function useCreateKpi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateKpiInput) => catalogKpisService.create(input),
    onSuccess: () => invalidateKpiCatalogQueries(qc),
  })
}

export function useUpdateKpi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKpiInput }) =>
      catalogKpisService.update(id, input),
    onSuccess: () => invalidateKpiCatalogQueries(qc),
  })
}

export function useToggleKpiStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      catalogKpisService.setActivo(id, activo),
    onSuccess: () => invalidateKpiCatalogQueries(qc),
  })
}
