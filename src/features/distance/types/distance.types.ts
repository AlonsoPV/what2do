/**
 * Tipos para el módulo de distancias reestructurado:
 * catálogos (orígenes, destinos), catálogo de rutas calculadas y solicitudes del tablero.
 */

// --- Catálogos ---
export interface DistanceOrigin {
  id: string
  nombre: string
  ubicacion: string
  latitud: number | null
  longitud: number | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface DistanceDestination {
  id: string
  nombre: string
  ubicacion: string
  latitud: number | null
  longitud: number | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface DistanceCatalogRow {
  id: string
  origin_id: string
  destination_id: string
  origen_nombre_snapshot: string | null
  destino_nombre_snapshot: string | null
  origen_ubicacion_snapshot: string | null
  destino_ubicacion_snapshot: string | null
  km_ida: number
  km_vuelta: number
  km_total: number
  meters_ida: number | null
  meters_vuelta: number | null
  duracion_ida_segundos: number | null
  duracion_vuelta_segundos: number | null
  route_mode: string
  api_source: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface DistanceRequestRow {
  id: string
  ruta: string | null
  fecha: string
  hora_alta: string
  origin_id: string
  destination_id: string
  distance_catalog_id: string | null
  km_ida: number | null
  km_vuelta: number | null
  km_total: number | null
  duracion_ida_segundos?: number | null
  duracion_vuelta_segundos?: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// --- Edge Function: calcular ruta por origin_id / destination_id ---
export interface CalculateRoutePayload {
  origin_id: string
  destination_id: string
  route_mode?: string
}

export interface CalculateRouteResult {
  ok: boolean
  km_ida?: number
  km_vuelta?: number
  km_total?: number
  distance_catalog_id?: string
  duracion_ida_segundos?: number
  duracion_vuelta_segundos?: number
  cached?: boolean
  message?: string
  status?: string
}

// --- Formulario solicitud (tablero) ---
export interface DistanceRequestFormValues {
  ruta?: string
  fecha: string
  hora_alta: string
  origin_id: string
  destination_id: string
}

// --- Request con joins para tabla (origen/destino nombres) ---
export interface DistanceRequestWithDetails extends DistanceRequestRow {
  origin?: DistanceOrigin | null
  destination?: DistanceDestination | null
}

// --- saved_route_requests: una fila por dirección (origin_id → destination_id) ---
export interface SavedRouteRequestRow {
  id: string
  origin_id: string
  destination_id: string
  origin_name_snapshot: string | null
  origin_location_snapshot: string | null
  destination_name_snapshot: string | null
  destination_location_snapshot: string | null
  distance_km: number
  distance_meters: number | null
  duration_seconds: number | null
  route_mode: string
  api_source: string
  created_by: string | null
  created_at: string
  updated_at: string
  activo: boolean
}

export interface SavedRouteRequestWithDetails extends SavedRouteRequestRow {
  origin?: DistanceOrigin | null
  destination?: DistanceDestination | null
}

/** Fila agrupada por par (ida + vuelta) para mostrar en tabla con columnas Ida, Vuelta, Total */
export interface SavedRoutePairRow {
  pairKey: string
  origin_id: string
  destination_id: string
  originName: string
  destinationName: string
  origin_location: string
  destination_location: string
  km_ida: number
  km_vuelta: number | null
  km_total: number
  duration_ida_seconds: number | null
  duration_vuelta_seconds: number | null
  updated_at: string
}

// --- Legado (distance_queries / formulario libre); mantener por compatibilidad si se usa en otro lugar ---
export interface DistanceQueryRow {
  id: string
  origen_nombre: string
  origen_ubicacion: string
  destino_nombre: string
  destino_ubicacion: string
  distancia_km: number
  distancia_metros: number | null
  duracion_segundos: number | null
  route_mode: string
  status: string
  error_message: string | null
  created_by: string | null
  created_at: string
}

export interface DistanceCalculatePayload {
  origen_ubicacion: string
  destino_ubicacion: string
  route_mode?: string
}

export interface DistanceCalculateResult {
  ok: boolean
  distance_km?: number
  distancia_metros?: number
  duracion_segundos?: number
  route_mode?: string
  status?: string
  message?: string
  cached?: boolean
}

export interface DistanceFormValues {
  origen_nombre: string
  origen_ubicacion: string
  destino_nombre: string
  destino_ubicacion: string
}
