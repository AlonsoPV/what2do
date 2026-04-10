import { useQuery } from '@tanstack/react-query'
import { listAccionesForGapIds } from '../services/gapAcciones.service'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '../kpiQueryKeys'

function stableGapIdsKey(ids: string[]): string {
  return [...ids].sort().join(',')
}

/**
 * Acciones con `gap_id` en el conjunto dado (p. ej. todos los gaps activos del tablero).
 */
export function useGapAccionesForGapIds(gapIds: string[]) {
  const key = stableGapIdsKey(gapIds)
  return useQuery({
    queryKey: [...kpiQueryKeys.gapAcciones, key] as const,
    queryFn: () => listAccionesForGapIds(gapIds),
    enabled: gapIds.length > 0,
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}
