/**
 * Servicio de distancias: Edge Function (cálculo por origin_id/destination_id)
 * y CRUD de solicitudes en distance_requests.
 */

import { supabase, SUPABASE_URL } from '@/lib/supabase/client'
import type {
  CalculateRoutePayload,
  CalculateRouteResult,
  DistanceRequestRow,
  DistanceRequestWithDetails,
  DistanceQueryRow,
  DistanceOrigin,
  DistanceDestination,
  DistanceCalculateResult,
} from '../types/distance.types'

const FUNCTION_NAME = 'calculate-distance'
const REQUEST_TIMEOUT_MS = 20_000
const DEBUG = import.meta.env.DEV

function getErrorMessage(
  res: Response,
  result: Partial<CalculateRouteResult & { message?: string }>
): string {
  if (result?.message && typeof result.message === 'string') return result.message
  if (res.status === 404) {
    return (
      'El servicio de cálculo de distancias no está disponible (404). ' +
      'Despliega la Edge Function en Supabase: en la raíz del proyecto ejecuta `npm run supabase:deploy` ' +
      '(o `npx supabase@latest functions deploy calculate-distance` vinculado a tu proyecto). ' +
      'En Dashboard → Edge Functions → calculate-distance configura los secretos GOOGLE_MAPS_API_KEY y SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  if (res.status === 401) return 'No autorizado. Cierra sesión y vuelve a entrar.'
  if (res.status === 500) return 'Error del servidor. Comprueba la configuración de la Edge Function.'
  return `Error ${res.status}. ${res.statusText || 'Sin detalles'}`
}

export const distanceService = {
  /**
   * Calcula distancia ida + vuelta vía Edge Function (catálogo primero, luego Google).
   * Recibe origin_id y destination_id; la función lee direcciones desde BD.
   * Lanza Error en caso de fallo para que la mutación rechace y la UI salga de "Calculando...".
   */
  async calculateRoute(payload: CalculateRoutePayload): Promise<CalculateRouteResult> {
    const routeMode = payload.route_mode ?? 'DRIVE'
    if (DEBUG) {
      console.log('[distance] calculateRoute: payload', { origin_id: payload.origin_id, destination_id: payload.destination_id, route_mode: routeMode })
    }
    // Usar getSession() para no disparar refreshSession() y evitar que el listener de Auth
    // provoque un re-render que interrumpa la mutación antes del fetch.
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    const token = session?.access_token
    if (DEBUG) {
      console.log('[distance] auth:', { hasSession: !!session, hasToken: !!token, tokenLength: token?.length ?? 0 })
    }
    if (!token) {
      throw new Error(
        'Debes iniciar sesión para calcular distancias. Si ya has iniciado sesión, cierra sesión y vuelve a entrar.'
      )
    }

    const baseUrl = SUPABASE_URL
    const url = `${baseUrl}/functions/v1/${FUNCTION_NAME}`
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (DEBUG) {
      console.log('[distance] request:', { url, hasBaseUrl: !!baseUrl, hasAnonKey: !!anonKey, timeoutMs: REQUEST_TIMEOUT_MS })
      console.warn('[distance] Si la función no se invoca, comprueba en el Dashboard que esta URL es de tu proyecto:', url)
    }
    if (!baseUrl || baseUrl === 'undefined') {
      throw new Error('VITE_SUPABASE_URL no está configurada. Revisa tu .env.')
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      if (DEBUG) console.log('[distance] fetch start →', url)
      res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(anonKey && { apikey: anonKey }),
        },
        body: JSON.stringify({
          origin_id: payload.origin_id,
          destination_id: payload.destination_id,
          route_mode: routeMode,
        }),
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (DEBUG) console.log('[distance] fetch error', err)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      throw new Error(
        isAbort
          ? 'La consulta tardó demasiado. Comprueba tu conexión o intenta de nuevo.'
          : (err instanceof Error ? err.message : 'Error de red al conectar con el servicio.')
      )
    }
    clearTimeout(timeoutId)

    let result: (CalculateRouteResult & { message?: string }) | null = null
    try {
      result = (await res.json()) as CalculateRouteResult & { message?: string }
    } catch {
      if (DEBUG) console.log('[distance] response: no JSON', { status: res.status, statusText: res.statusText })
      if (!res.ok) {
        throw new Error(getErrorMessage(res, { message: res.statusText }))
      }
      throw new Error('La respuesta del servidor no es válida.')
    }

    if (DEBUG) {
      console.log('[distance] response:', { status: res.status, ok: res.ok, resultOk: result?.ok, message: result?.message })
      // 404 puede ser "función no desplegada" (body vacío) o negocio (ej. Origen no encontrado) desde la Edge Function
      if (res.status === 404 && !result?.message) {
        console.warn('[distance] 404 sin mensaje: suele ser función no desplegada. Ejecuta: npm run supabase:deploy')
      }
    }

    if (!res.ok) {
      throw new Error(getErrorMessage(res, result ?? {}))
    }

    if (!result?.ok && result?.message) {
      throw new Error(result.message)
    }

    return result
  },

  /**
   * Lista solicitudes del tablero (distance_requests). RLS filtra por created_by.
   * Incluye origen y destino para mostrar nombres en la tabla.
   */
  async listRequests(): Promise<DistanceRequestWithDetails[]> {
    const { data, error } = await supabase
      .from('distance_requests')
      .select(
        '*, origin:distance_origins!origin_id(id,nombre,ubicacion), destination:distance_destinations!destination_id(id,nombre,ubicacion)'
      )
      .order('created_at', { ascending: false })

    if (error) throw error
    type RawRow = DistanceRequestRow & {
      origin?: DistanceOrigin | DistanceOrigin[] | null
      destination?: DistanceDestination | DistanceDestination[] | null
    }
    const rows = (data ?? []) as RawRow[]
    return rows.map((r): DistanceRequestWithDetails => {
      const origin = r.origin == null ? null : Array.isArray(r.origin) ? r.origin[0] ?? null : r.origin
      const destination = r.destination == null ? null : Array.isArray(r.destination) ? r.destination[0] ?? null : r.destination
      return {
        ...r,
        origin: origin as DistanceRequestWithDetails['origin'],
        destination: destination as DistanceRequestWithDetails['destination'],
      }
    })
  },

  /**
   * Crea una solicitud en distance_requests. RLS exige created_by = usuario actual.
   */
  async createRequest(row: {
    ruta?: string | null
    fecha: string
    hora_alta: string
    origin_id: string
    destination_id: string
    distance_catalog_id?: string | null
    km_ida?: number | null
    km_vuelta?: number | null
    km_total?: number | null
    duracion_ida_segundos?: number | null
    duracion_vuelta_segundos?: number | null
    created_by: string | null
  }): Promise<DistanceRequestRow> {
    const { data, error } = await supabase
      .from('distance_requests')
      .insert({
        ruta: row.ruta?.trim() ?? null,
        fecha: row.fecha,
        hora_alta: row.hora_alta,
        origin_id: row.origin_id,
        destination_id: row.destination_id,
        distance_catalog_id: row.distance_catalog_id ?? null,
        km_ida: row.km_ida ?? null,
        km_vuelta: row.km_vuelta ?? null,
        km_total: row.km_total ?? null,
        duracion_ida_segundos: row.duracion_ida_segundos ?? null,
        duracion_vuelta_segundos: row.duracion_vuelta_segundos ?? null,
        created_by: row.created_by,
      })
      .select()
      .single()

    if (error) throw error
    return data as DistanceRequestRow
  },

  /**
   * Legacy: calcula por direcciones de texto (obsoleto).
   * La Edge Function actual solo acepta origin_id/destination_id. Usa el tablero de distancias con catálogo.
   */
  async calculate(payload: { origen_ubicacion: string; destino_ubicacion: string; route_mode?: string }): Promise<DistanceCalculateResult> {
    void payload
    throw new Error(
      'El cálculo por direcciones de texto está obsoleto. Usa el tablero de distancias y elige origen y destino del catálogo.'
    )
  },

  /**
   * Legacy: inserta en distance_queries (obsoleto).
   * Usa createRequest() para guardar en distance_requests.
   */
  async insert(row: {
    origen_nombre: string
    origen_ubicacion: string
    destino_nombre: string
    destino_ubicacion: string
    distancia_km: number
    distancia_metros?: number | null
    duracion_segundos?: number | null
    route_mode?: string
    status?: string
    error_message?: string | null
    created_by: string | null
  }): Promise<DistanceQueryRow> {
    void row
    throw new Error(
      'Guardar en el historial antiguo está obsoleto. Usa "Guardar solicitud" en el tablero de distancias.'
    )
  },

  /** Legacy: lista historial en distance_queries (mantener por compatibilidad). */
  async list(): Promise<DistanceQueryRow[]> {
    const { data, error } = await supabase
      .from('distance_queries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as DistanceQueryRow[]
  },
}
