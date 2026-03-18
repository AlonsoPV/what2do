/**
 * Hooks: listar y crear solicitudes del tablero de distancias (distance_requests).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { distanceService } from '../services/distance.service'
export const DISTANCE_REQUESTS_QUERY_KEY = ['distance', 'requests'] as const

export function useDistanceRequests() {
  return useQuery({
    queryKey: DISTANCE_REQUESTS_QUERY_KEY,
    queryFn: () => distanceService.listRequests(),
  })
}

export function useCreateDistanceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof distanceService.createRequest>[0]) =>
      distanceService.createRequest(row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISTANCE_REQUESTS_QUERY_KEY })
    },
  })
}
