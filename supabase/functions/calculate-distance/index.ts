/**
 * Edge Function: calcular distancia ida + vuelta entre origen y destino por ID.
 * - Input: origin_id, destination_id (UUIDs); route_mode opcional (default DRIVE).
 * - Lee direcciones desde distance_origins y distance_destinations.
 * - Busca en distance_catalog; si existe registro activo, devuelve km_ida, km_vuelta, km_total sin llamar a Google.
 * - Si no existe: dos llamadas a Google (ida y vuelta), inserta en distance_catalog con snapshots.
 * API: https://routes.googleapis.com/directions/v2:computeRoutes
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const ROUTE_MODE_DEFAULT = 'DRIVE'
const GOOGLE_TIMEOUT_MS = 25_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseUuid(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : ''
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(s) ? s : null
}

function parseDurationSeconds(duration: string | undefined | null): number | null {
  if (!duration || typeof duration !== 'string') return null
  const match = duration.match(/^(\d+)s?$/)
  return match ? parseInt(match[1], 10) : null
}

async function computeOneRoute(
  apiKey: string,
  originAddress: string,
  destinationAddress: string,
  routeMode: string
): Promise<{ km: number; meters: number; duracionSegundos: number | null }> {
  const requestBody = {
    origin: { address: originAddress },
    destination: { address: destinationAddress },
    travelMode: routeMode,
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS)
  try {
    const res = await fetch(ROUTES_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify(requestBody),
    })
    clearTimeout(timeoutId)
    const data = (await res.json().catch(() => ({}))) as {
      routes?: Array<{ distanceMeters?: number; duration?: string }>
      error?: { message?: string }
    }
    if (!res.ok) {
      throw new Error(data?.error?.message || `Google Routes API: ${res.status}`)
    }
    const routes = data?.routes
    if (!routes?.length) {
      throw new Error('No se encontró ruta entre las ubicaciones indicadas.')
    }
    const route = routes[0]
    const meters = route.distanceMeters ?? 0
    const km = Math.round((meters / 1000) * 100) / 100
    const duracionSegundos = parseDurationSeconds(route.duration ?? undefined)
    return { km, meters, duracionSegundos: duracionSegundos ?? null }
  } catch (e) {
    clearTimeout(timeoutId)
    throw e
  }
}

Deno.serve(async (req) => {
  console.log('[calculate-distance] invoked', { method: req.method, url: req.url })
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('[calculate-distance] reject: method not POST')
    return json({ ok: false, message: 'Método no permitido' }, 405)
  }

  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  console.log('[calculate-distance] env:', { hasGoogleKey: !!apiKey, hasSupabaseUrl: !!supabaseUrl, hasServiceRole: !!serviceRoleKey })

  if (!apiKey) {
    console.log('[calculate-distance] error: GOOGLE_MAPS_API_KEY not set')
    return json({ ok: false, message: 'Configuración del servicio no disponible' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  const hasBearer = authHeader?.startsWith('Bearer ')
  console.log('[calculate-distance] auth header:', { hasAuth: !!authHeader, hasBearer, tokenLength: hasBearer ? authHeader!.slice(7).length : 0 })

  if (!hasBearer) {
    console.log('[calculate-distance] 401: no Bearer token')
    return json({ ok: false, message: 'No autorizado. Inicia sesión o cierra sesión y vuelve a entrar.' }, 401)
  }

  const token = authHeader!.slice(7)
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[calculate-distance] error: SUPABASE_URL or SERVICE_ROLE not set')
    return json({ ok: false, message: 'Configuración de Supabase no disponible' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  console.log('[calculate-distance] getUser:', { hasUser: !!userData?.user, error: userError?.message ?? null })

  if (userError || !userData.user) {
    console.log('[calculate-distance] 401: invalid or expired session', userError?.message ?? 'no user')
    return json({ ok: false, message: 'Sesión inválida o expirada. Cierra sesión y vuelve a entrar.' }, 401)
  }

  let body: { origin_id?: string; destination_id?: string; route_mode?: string } | null = null
  try {
    body = (await req.json()) as typeof body
  } catch (e) {
    console.log('[calculate-distance] 400: invalid JSON body', String(e))
    return json({ ok: false, message: 'Cuerpo de la solicitud inválido' }, 400)
  }

  const originId = parseUuid(body?.origin_id)
  const destinationId = parseUuid(body?.destination_id)
  const routeMode = trim(body?.route_mode) || ROUTE_MODE_DEFAULT

  console.log('[calculate-distance] body:', { origin_id: body?.origin_id, destination_id: body?.destination_id, parsedOriginId: originId ?? null, parsedDestId: destinationId ?? null })

  if (!originId || !destinationId) {
    console.log('[calculate-distance] 400: missing or invalid origin_id/destination_id')
    return json({
      ok: false,
      message: 'origin_id y destination_id son obligatorios y deben ser UUIDs válidos',
    }, 400)
  }

  // Leer orígenes y destinos para obtener direcciones
  const [originRow, destRow, catalogRow] = await Promise.all([
    adminClient.from('distance_origins').select('id, nombre, ubicacion').eq('id', originId).maybeSingle(),
    adminClient.from('distance_destinations').select('id, nombre, ubicacion').eq('id', destinationId).maybeSingle(),
    adminClient
      .from('distance_catalog')
      .select('id, km_ida, km_vuelta, km_total, duracion_ida_segundos, duracion_vuelta_segundos')
      .eq('origin_id', originId)
      .eq('destination_id', destinationId)
      .eq('route_mode', routeMode)
      .eq('activo', true)
      .maybeSingle(),
  ])

  const origin = originRow.data
  const destination = destRow.data
  const catalog = catalogRow.data

  console.log('[calculate-distance] db:', {
    originError: originRow.error?.message ?? null,
    destError: destRow.error?.message ?? null,
    hasOrigin: !!origin,
    hasDestination: !!destination,
    catalogHit: !!catalog,
  })

  if (originRow.error) {
    console.log('[calculate-distance] 500: origin read error', originRow.error.message)
    return json({ ok: false, message: 'Error al leer origen: ' + (originRow.error.message || '') }, 500)
  }
  if (destRow.error) {
    console.log('[calculate-distance] 500: destination read error', destRow.error.message)
    return json({ ok: false, message: 'Error al leer destino: ' + (destRow.error.message || '') }, 500)
  }
  if (!origin) {
    console.log('[calculate-distance] 404: origin not found', originId)
    return json({ ok: false, message: 'Origen no encontrado' }, 404)
  }
  if (!destination) {
    console.log('[calculate-distance] 404: destination not found', destinationId)
    return json({ ok: false, message: 'Destino no encontrado' }, 404)
  }

  const origenUbicacion = trim(origin.ubicacion)
  const destinoUbicacion = trim(destination.ubicacion)
  if (!origenUbicacion || !destinoUbicacion) {
    console.log('[calculate-distance] 400: origin or destination missing ubicacion')
    return json({ ok: false, message: 'Origen o destino sin ubicación definida' }, 400)
  }

  // Hit de catálogo: devolver sin llamar a Google
  if (catalog) {
    console.log('[calculate-distance] cache hit, returning catalog data')
    return json({
      ok: true,
      km_ida: Number(catalog.km_ida),
      km_vuelta: Number(catalog.km_vuelta),
      km_total: Number(catalog.km_total),
      distance_catalog_id: catalog.id,
      duracion_ida_segundos: catalog.duracion_ida_segundos ?? undefined,
      duracion_vuelta_segundos: catalog.duracion_vuelta_segundos ?? undefined,
      cached: true,
    })
  }

  // Calcular ida y vuelta con Google
  console.log('[calculate-distance] cache miss, calling Google Routes API (ida + vuelta)')
  let ida: { km: number; meters: number; duracionSegundos: number | null }
  let vuelta: { km: number; meters: number; duracionSegundos: number | null }
  try {
    ida = await computeOneRoute(apiKey, origenUbicacion, destinoUbicacion, routeMode)
    console.log('[calculate-distance] Google ida ok:', { km: ida.km })
    vuelta = await computeOneRoute(apiKey, destinoUbicacion, origenUbicacion, routeMode)
    console.log('[calculate-distance] Google vuelta ok:', { km: vuelta.km })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al consultar la ruta'
    console.log('[calculate-distance] Google API error:', message)
    return json({
      ok: false,
      message,
      status: 'error',
    }, 502)
  }

  const km_ida = ida.km
  const km_vuelta = vuelta.km
  const km_total = Math.round((km_ida + km_vuelta) * 100) / 100

  // Upsert en distance_catalog para que ida, vuelta y total queden siempre en el catálogo
  const catalogPayload = {
    origin_id: originId,
    destination_id: destinationId,
    origen_nombre_snapshot: origin.nombre,
    destino_nombre_snapshot: destination.nombre,
    origen_ubicacion_snapshot: origenUbicacion,
    destino_ubicacion_snapshot: destinoUbicacion,
    km_ida,
    km_vuelta,
    km_total,
    meters_ida: ida.meters,
    meters_vuelta: vuelta.meters,
    duracion_ida_segundos: ida.duracionSegundos,
    duracion_vuelta_segundos: vuelta.duracionSegundos,
    route_mode: routeMode,
    api_source: 'google_routes',
    activo: true,
  }

  const { data: upserted, error: upsertError } = await adminClient
    .from('distance_catalog')
    .upsert(catalogPayload, {
      onConflict: 'origin_id,destination_id,route_mode',
      ignoreDuplicates: false,
    })
    .select('id, km_ida, km_vuelta, km_total, duracion_ida_segundos, duracion_vuelta_segundos')
    .maybeSingle()

  if (upsertError) {
    console.log('[calculate-distance] catalog upsert error:', upsertError.code, upsertError.message)
    // Devolver el cálculo igual; el catálogo se actualizará en la próxima recalculación
  }

  const catalogRow = upserted
  const catalogId = catalogRow?.id
  console.log('[calculate-distance] success:', { km_total, km_vuelta, catalogId: catalogId ?? null })

  return json({
    ok: true,
    km_ida: catalogRow ? Number(catalogRow.km_ida) : km_ida,
    km_vuelta: catalogRow ? Number(catalogRow.km_vuelta) : km_vuelta,
    km_total: catalogRow ? Number(catalogRow.km_total) : km_total,
    distance_catalog_id: catalogId,
    duracion_ida_segundos: catalogRow?.duracion_ida_segundos ?? ida.duracionSegundos ?? undefined,
    duracion_vuelta_segundos: catalogRow?.duracion_vuelta_segundos ?? vuelta.duracionSegundos ?? undefined,
    cached: false,
  })
})
