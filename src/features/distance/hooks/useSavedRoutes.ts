/**
 * Hooks: lookup de ruta guardada, guardar ruta calculada (dos direcciones), listar rutas guardadas.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  lookupSavedRoute,
  saveRouteCalculated,
  listSavedRoutes,
  deactivateSavedRoutePair,
} from '../services/savedRoutes.service'
import type { SaveRouteCalculatedPayload } from '../services/savedRoutes.service'

export const SAVED_ROUTES_QUERY_KEY = ['distance', 'saved_routes'] as const

export function savedRouteLookupKey(originId: string, destinationId: string, routeMode?: string) {
  return [...SAVED_ROUTES_QUERY_KEY, 'lookup', originId, destinationId, routeMode ?? 'DRIVE'] as const
}

/**
 * Lookup de ruta guardada por dirección exacta (origin_id, destination_id).
 * Solo ejecuta la query cuando ambos IDs están definidos y no son vacíos.
 */
export function useRouteLookup(originId: string, destinationId: string, routeMode: string = 'DRIVE') {
  const enabled = Boolean(originId && destinationId && originId !== destinationId)
  return useQuery({
    queryKey: savedRouteLookupKey(originId, destinationId, routeMode),
    queryFn: () => lookupSavedRoute(originId, destinationId, routeMode),
    enabled,
  })
}

/**
 * Guarda la ruta calculada como dos registros (A→B y B→A).
 * Invalida listado y lookups de saved routes al éxito.
 */
export function useSaveRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveRouteCalculatedPayload) => saveRouteCalculated(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_ROUTES_QUERY_KEY })
    },
  })
}

/**
 * Desactiva el par guardado (ida + vuelta). Invalida listado y lookups.
 */
export function useDeactivateSavedRoutePair() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { originId: string; destinationId: string; routeMode?: string }) =>
      deactivateSavedRoutePair(args.originId, args.destinationId, args.routeMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_ROUTES_QUERY_KEY })
    },
  })
}

/**
 * Lista todas las rutas guardadas (para el tablero).
 */
export function useSavedRoutesList() {
  return useQuery({
    queryKey: [...SAVED_ROUTES_QUERY_KEY, 'list'],
    queryFn: () => listSavedRoutes(),
  })
}
