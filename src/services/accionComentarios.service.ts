/**
 * Comentarios de acciones (tabla accion_comentarios).
 */

import { supabase } from '@/lib/supabase/client'
import type { AccionComentario } from '@/types/accionComentario'

const TABLE = 'accion_comentarios'

export const accionComentariosService = {
  /** Cuenta comentarios por cada accion_id. Útil para badges en cards. */
  async countByAccionIds(accionIds: string[]): Promise<Record<string, number>> {
    if (accionIds.length === 0) return {}
    const { data, error } = await supabase
      .from(TABLE)
      .select('accion_id')
      .in('accion_id', accionIds)
    if (error) throw error
    const counts: Record<string, number> = {}
    for (const id of accionIds) counts[id] = 0
    for (const row of data ?? []) {
      const aid = (row as { accion_id: string }).accion_id
      if (aid in counts) counts[aid]++
    }
    return counts
  },

  async listByAccion(accionId: string): Promise<AccionComentario[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('accion_id', accionId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as AccionComentario[]
  },

  async listByAccionIds(accionIds: string[]): Promise<AccionComentario[]> {
    if (accionIds.length === 0) return []
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .in('accion_id', accionIds)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AccionComentario[]
  },

  async create(input: {
    accion_id: string
    contenido: string
    created_by?: string | null
    asignado?: string | null
    etiquetas?: string[]
    adjuntos?: { storage_path: string; file_name: string }[]
  }): Promise<AccionComentario> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        accion_id: input.accion_id,
        contenido: input.contenido.trim(),
        created_by: input.created_by ?? null,
        asignado: input.asignado ?? null,
        etiquetas: input.etiquetas ?? [],
        adjuntos: input.adjuntos ?? [],
      })
      .select()
      .single()
    if (error) throw error
    return data as AccionComentario
  },

  async update(
    id: string,
    patch: { asignado?: string | null; etiquetas?: string[] }
  ): Promise<AccionComentario> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AccionComentario
  },
}
