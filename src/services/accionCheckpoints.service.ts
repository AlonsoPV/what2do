/**
 * CRUD de checkpoints (puntos a validar) por acción.
 * Tabla: accion_checkpoints.
 */

import { supabase } from '@/lib/supabase/client'
import type { AccionCheckpoint } from '@/types'

const TABLE = 'accion_checkpoints'

export type AccionCheckpointInsert = {
  accion_id: string
  texto: string
  orden: number
  obligatorio?: boolean
}

export const accionCheckpointsService = {
  async listByAccionId(accionId: string): Promise<AccionCheckpoint[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('accion_id', accionId)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as AccionCheckpoint[]
  },

  /**
   * true si la acción no puede pasar a Hecho (checkpoints activos sin completar).
   * @param onlyObligatorio — fase 2: si true, solo filas con obligatorio=true cuentan como bloqueo.
   */
  async hasPendingBlockingHecho(
    accionId: string,
    opts?: { onlyObligatorio?: boolean }
  ): Promise<boolean> {
    let q = supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('accion_id', accionId)
      .eq('activo', true)
      .eq('completado', false)
    if (opts?.onlyObligatorio) {
      q = q.eq('obligatorio', true)
    }
    const { count, error } = await q
    if (error) throw error
    return (count ?? 0) > 0
  },

  /** Mapa accion_id → true si tiene pendientes que bloquean Hecho. */
  async pendingBlockingHechoByAccionIds(
    accionIds: string[],
    opts?: { onlyObligatorio?: boolean }
  ): Promise<Record<string, boolean>> {
    const map: Record<string, boolean> = {}
    if (accionIds.length === 0) return map
    for (const id of accionIds) map[id] = false

    let q = supabase
      .from(TABLE)
      .select('accion_id')
      .in('accion_id', accionIds)
      .eq('activo', true)
      .eq('completado', false)
    if (opts?.onlyObligatorio) {
      q = q.eq('obligatorio', true)
    }
    const { data, error } = await q
    if (error) throw error
    for (const row of data ?? []) {
      const aid = (row as { accion_id: string }).accion_id
      map[aid] = true
    }
    return map
  },

  /** Conteo de checkpoints activos por acción (para UI de progreso). */
  async progressByAccionIds(
    accionIds: string[]
  ): Promise<Record<string, { total: number; completed: number }>> {
    const out: Record<string, { total: number; completed: number }> = {}
    if (accionIds.length === 0) return out
    for (const id of accionIds) {
      out[id] = { total: 0, completed: 0 }
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select('accion_id, completado')
      .in('accion_id', accionIds)
      .eq('activo', true)
    if (error) throw error
    for (const row of data ?? []) {
      const r = row as { accion_id: string; completado: boolean }
      const slot = out[r.accion_id]
      if (!slot) continue
      slot.total += 1
      if (r.completado) slot.completed += 1
    }
    return out
  },

  async insert(row: AccionCheckpointInsert): Promise<AccionCheckpoint> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        accion_id: row.accion_id,
        texto: row.texto.trim(),
        orden: row.orden,
        obligatorio: row.obligatorio ?? true,
        activo: true,
        completado: false,
      })
      .select()
      .single()
    if (error) throw error
    return data as AccionCheckpoint
  },

  async insertMany(accionId: string, rows: Omit<AccionCheckpointInsert, 'accion_id'>[]): Promise<void> {
    if (rows.length === 0) return
    const payload = rows.map((r, i) => ({
      accion_id: accionId,
      texto: r.texto.trim(),
      orden: r.orden ?? i,
      obligatorio: r.obligatorio ?? true,
      activo: true,
      completado: false,
    }))
    const { error } = await supabase.from(TABLE).insert(payload)
    if (error) throw error
  },

  async getById(id: string): Promise<AccionCheckpoint> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) throw error
    return data as AccionCheckpoint
  },

  async update(
    id: string,
    patch: Partial<Pick<AccionCheckpoint, 'texto' | 'orden' | 'obligatorio'>>
  ): Promise<AccionCheckpoint> {
    const body: Record<string, unknown> = {}
    if (patch.texto !== undefined) body.texto = String(patch.texto).trim()
    if (patch.orden !== undefined) body.orden = patch.orden
    if (patch.obligatorio !== undefined) body.obligatorio = patch.obligatorio
    if (Object.keys(body).length === 0) return this.getById(id)
    const { data, error } = await supabase.from(TABLE).update(body).eq('id', id).select().single()
    if (error) throw error
    return data as AccionCheckpoint
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },

  async setCompletado(
    id: string,
    completado: boolean,
    checkedByUsuarioId: string | null
  ): Promise<AccionCheckpoint> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        completado,
        checked_at: completado ? new Date().toISOString() : null,
        checked_by: completado ? checkedByUsuarioId : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AccionCheckpoint
  },
}
