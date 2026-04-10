import { useQuery } from '@tanstack/react-query'
import { listGlobalScoreSnapshots } from '../services/globalScoreSnapshots.service'
import type { GlobalScoreSnapshotsOpts } from '../services/globalScoreSnapshots.service'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '../kpiQueryKeys'

export type UseGlobalScoreSnapshotsOptions = GlobalScoreSnapshotsOpts & {
  enabled?: boolean
}

/**
 * Historial de snapshots del score global O2C.
 */
export function useGlobalScoreSnapshots(options: UseGlobalScoreSnapshotsOptions = {}) {
  const { enabled = true, limit, ...rest } = options
  return useQuery({
    queryKey: [...kpiQueryKeys.globalScoreSnapshots, { limit }] as const,
    queryFn: () => listGlobalScoreSnapshots({ limit, ...rest }),
    enabled,
    staleTime: KPI_STALE_TIME_LIST_MS,
  })
}
