/**
 * Servicio de usuarios (tabla usuarios).
 * Spec §4, §15 RLS: cada usuario ve solo su perfil; admins ven todo.
 * TODO: Spec §17 — policy de lectura actual puede impedir listar responsables
 * en dropdowns; revisar vista pública de nombres o policy más amplia.
 */

import { supabase } from '@/lib/supabase/client'
import type { Usuario } from '@/types'

const TABLE = 'usuarios'

export const usuariosService = {
  /** Perfil por auth user id; null si no hay fila (evita error HTTP de .single() con 0 filas). */
  async getByAuthId(authUserId: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle()
    if (error) throw error
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
