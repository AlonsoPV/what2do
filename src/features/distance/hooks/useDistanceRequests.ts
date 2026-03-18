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
    mutationFn: (row: {
      ruta?: string | null
      fecha: string
      hora_alta: string
      origin_id: string
      destination_id: string
      distance_catalog_id?: string | null
      km_ida?: number | null
      km_vuelta?: number | null
      km_total?: number | null
      created_by: string | null
    }) => distanceService.createRequest(row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISTANCE_REQUESTS_QUERY_KEY })
    },
  })
}
