import { useQuery } from '@tanstack/react-query'
import { KPI_STALE_TIME_LIST_MS, kpiQueryKeys } from '../kpiQueryKeys'
import { fetchStrategicNorth, listActiveFces } from '../services/strategicEntities.service'

export function useStrategicNorthQuery(enabled = true) {
  return useQuery({
    queryKey: [...kpiQueryKeys.strategicNorth] as const,
    queryFn: fetchStrategicNorth,
    staleTime: KPI_STALE_TIME_LIST_MS,
    enabled,
  })
}

export function useFcesQuery(enabled = true) {
  return useQuery({
    queryKey: [...kpiQueryKeys.fces] as const,
    queryFn: listActiveFces,
    staleTime: KPI_STALE_TIME_LIST_MS,
    enabled,
  })
}
