/**
 * Servicio de rutas guardadas (saved_route_requests).
 * Lookup por dirección exacta; guardado crea dos filas (A→B y B→A).
 */

import { supabase } from '@/lib/supabase/client'
import type {
  SavedRouteRequestRow,
  SavedRouteRequestWithDetails,
  DistanceOrigin,
  DistanceDestination,
} from '../types/distance.types'

const TABLE = 'saved_route_requests'
const ROUTE_MODE_DEFAULT = 'DRIVE'

/**
 * Busca una ruta guardada por dirección exacta (origin_id, destination_id, route_mode).
 * A→B y B→A son consultas distintas.
 */
export async function lookupSavedRoute(
  originId: string,
  destinationId: string,
  routeMode: string = ROUTE_MODE_DEFAULT
): Promise<SavedRouteRequestRow | null> {
  if (!originId || !destinationId) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('origin_id', originId)
    .eq('destination_id', destinationId)
    .eq('route_mode', routeMode)
    .eq('activo', true)
    .maybeSingle()
  if (error) throw error
  return data as SavedRouteRequestRow | null
}

export interface SaveRouteCalculatedPayload {
  origin_id: string
  destination_id: string
  origin_name_snapshot: string
  origin_location_snapshot: string
  destination_name_snapshot: string
  destination_location_snapshot: string
  km_ida: number
  km_vuelta: number
  meters_ida?: number | null
  meters_vuelta?: number | null
  duracion_ida_segundos?: number | null
  duracion_vuelta_segundos?: number | null
  route_mode?: string
  created_by: string | null
}

/**
 * Guarda la ruta calculada como dos registros: A→B y B→A.
 * Usa upsert para no duplicar y actualizar si ya existe.
 */
export async function saveRouteCalculated(payload: SaveRouteCalculatedPayload): Promise<void> {
  const routeMode = payload.route_mode?.trim() || ROUTE_MODE_DEFAULT
  const A = payload.origin_id
  const B = payload.destination_id

  const row1 = {
    origin_id: A,
    destination_id: B,
    origin_name_snapshot: payload.origin_name_snapshot,
    origin_location_snapshot: payload.origin_location_snapshot,
    destination_name_snapshot: payload.destination_name_snapshot,
    destination_location_snapshot: payload.destination_location_snapshot,
    distance_km: payload.km_ida,
    distance_meters: payload.meters_ida ?? null,
    duration_seconds: payload.duracion_ida_segundos ?? null,
    route_mode: routeMode,
    api_source: 'google_routes',
    created_by: payload.created_by,
    activo: true,
  }

  const row2 = {
    origin_id: B,
    destination_id: A,
    origin_name_snapshot: payload.destination_name_snapshot,
    origin_location_snapshot: payload.destination_location_snapshot,
    destination_name_snapshot: payload.origin_name_snapshot,
    destination_location_snapshot: payload.origin_location_snapshot,
    distance_km: payload.km_vuelta,
    distance_meters: payload.meters_vuelta ?? null,
    duration_seconds: payload.duracion_vuelta_segundos ?? null,
    route_mode: routeMode,
    api_source: 'google_routes',
    created_by: payload.created_by,
    activo: true,
  }

  const { error: e1 } = await supabase
    .from(TABLE)
    .upsert(row1, {
      onConflict: 'origin_id,destination_id,route_mode',
      ignoreDuplicates: false,
    })
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from(TABLE)
    .upsert(row2, {
      onConflict: 'origin_id,destination_id,route_mode',
      ignoreDuplicates: false,
    })
  if (e2) throw e2
}

/**
 * Lista rutas guardadas para el tablero (con joins a distance_places para nombres).
 * origin_id y destination_id referencian distance_places desde la migración 20260313320004.
 */
export async function listSavedRoutes(): Promise<SavedRouteRequestWithDetails[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      '*, origin:distance_places!origin_id(id,nombre,ubicacion), destination:distance_places!destination_id(id,nombre,ubicacion)'
    )
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  type RawRow = SavedRouteRequestRow & {
    origin?: DistanceOrigin | DistanceOrigin[] | null
    destination?: DistanceDestination | DistanceDestination[] | null
  }
  const rows = (data ?? []) as RawRow[]
  return rows.map((r): SavedRouteRequestWithDetails => {
    const origin = r.origin == null ? null : Array.isArray(r.origin) ? r.origin[0] ?? null : r.origin
    const destination = r.destination == null ? null : Array.isArray(r.destination) ? r.destination[0] ?? null : r.destination
    return {
      ...r,
      origin: origin as SavedRouteRequestWithDetails['origin'],
      destination: destination as SavedRouteRequestWithDetails['destination'],
    }
  })
}
