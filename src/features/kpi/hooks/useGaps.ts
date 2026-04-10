import { useQuery } from '@tanstack/react-query'
import { getGapById, listGaps } from '../services/gaps.service'
import type { GapsListFilters } from '../types/kpi.types'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '../kpiQueryKeys'

export type UseGapsOptions = {
  filters?: GapsListFilters
  enabled?: boolean
}

function serializeGapsFilters(filters: GapsListFilters | undefined): string {
  return JSON.stringify(filters ?? {})
}

/**
 * Lista de brechas O2C (`gaps`).
 */
export function useGaps(options: UseGapsOptions = {}) {
  const { filters, enabled = true } = options
  return useQuery({
    queryKey: [...kpiQueryKeys.gaps, serializeGapsFilters(filters)] as const,
    queryFn: () => listGaps(filters),
    enabled,
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}

/**
 * Detalle de un gap por id.
 */
export function useGap(gapId: string | undefined | null) {
  return useQuery({
    queryKey: gapId ? kpiQueryKeys.gap(gapId) : ['gaps', 'none'],
    queryFn: () => getGapById(gapId!),
    enabled: Boolean(gapId),
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}
