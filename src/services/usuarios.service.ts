/**
 * Servicio de usuarios (tabla usuarios).
 * Spec §4, §15 RLS: cada usuario ve solo su perfil; admins ven todo.
 * TODO: Spec §17 — policy de lectura actual puede impedir listar responsables
 * en dropdowns; revisar vista pública de nombres o policy más amplia.
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/lib/supabase/client'
import { fetchWithTimeout } from '@/lib/fetchWithTimeout'
import type { Usuario } from '@/types'

const TABLE = 'usuarios'
const __DEV__ = import.meta.env.DEV
const PROFILE_SELECT = 'id,user_id,nombre,rol,area,activo,onboarding_completed,created_at,updated_at'

function devLog(message: string, payload?: unknown) {
  if (!__DEV__) return
  if (payload === undefined) {
    console.log(`[usuarios] ${message}`)
    return
  }
  console.log(`[usuarios] ${message}`, payload)
}

export const usuariosService = {
  async getByAuthIdWithAccessToken(authUserId: string, accessToken: string): Promise<Usuario | null> {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`)
    url.searchParams.set('select', PROFILE_SELECT)
    url.searchParams.set('user_id', `eq.${authUserId}`)
    url.searchParams.set('limit', '1')

    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`PROFILE_FETCH_FAILED_${response.status}`)
    }

    const rows = (await response.json()) as Usuario[]
    const profile = rows[0] ?? null
    const elapsedMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
    )

    devLog('getByAuthIdWithAccessToken resolved', {
      authUserId,
      found: !!profile,
      elapsedMs,
    })
    return profile
  },

  /** Perfil por auth user id; null si no hay fila (evita error HTTP de .single() con 0 filas). */
  async getByAuthId(authUserId: string): Promise<Usuario | null> {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const { data, error } = await supabase
      .from(TABLE)
      .select(PROFILE_SELECT)
      .eq('user_id', authUserId)
      .maybeSingle()

    const elapsedMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
    )

    if (error) throw error
    devLog('getByAuthId resolved', {
      authUserId,
      found: !!data,
      elapsedMs,
    })
    return (data as Usuario) ?? null
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Usuario
  },

  /** Lista de usuarios (sujeto a RLS; admins pueden ver todos). TODO: uso en dropdowns. */
  async list() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, nombre, rol, area')
      .eq('activo', true)
      .order('nombre')
    if (error) throw error
    return (data ?? []) as Pick<Usuario, 'id' | 'nombre' | 'rol' | 'area'>[]
  },

  async updateOnboardingCompleted(usuarioId: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ onboarding_completed: true })
      .eq('id', usuarioId)
      .select()
      .single()
    if (error) throw error
    return data as Usuario
  },
}
