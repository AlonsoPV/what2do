/**
 * Servicio de sprints Scrum (Planning / Review / Retro).
 */

import { supabase } from '@/lib/supabase/client'
import type { Sprint, SprintRetroItem } from '@/types'

export const sprintsService = {
  async getActivo(): Promise<Sprint | null> {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('estado', 'activo')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data as Sprint | null
  },

  async list(): Promise<Sprint[]> {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .order('fecha_inicio', { ascending: false })
    if (error) throw error
    return (data ?? []) as Sprint[]
  },

  async create(payload: Partial<Sprint>): Promise<Sprint> {
    const nombre = payload.nombre?.trim()
    const fechaInicio = payload.fecha_inicio
    const fechaFin = payload.fecha_fin

    if (!nombre) throw new Error('El nombre del sprint es obligatorio.')
    if (!fechaInicio || !fechaFin) throw new Error('Define fecha de inicio y fecha de fin.')
    if (fechaFin < fechaInicio) throw new Error('La fecha de fin no puede ser anterior al inicio.')

    const { data: activos, error: listErr } = await supabase
      .from('sprints')
      .select('id')
      .eq('estado', 'activo')
    if (listErr) throw listErr

    if (activos?.length) {
      const { error: closeErr } = await supabase
        .from('sprints')
        .update({ estado: 'completado' })
        .in(
          'id',
          activos.map((s) => s.id)
        )
      if (closeErr) throw closeErr
    }

    const { data, error } = await supabase
      .from('sprints')
      .insert({ ...payload, nombre, objetivo: payload.objetivo?.trim() || null })
      .select()
      .single()
    if (error) throw error
    return data as Sprint
  },

  async update(id: string, payload: Partial<Sprint>): Promise<Sprint> {
    const { data, error } = await supabase.from('sprints').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data as Sprint
  },

  async cerrar(id: string, velocidadReal: number): Promise<Sprint> {
    return sprintsService.update(id, {
      estado: 'completado',
      velocidad_real: velocidadReal,
    })
  },
}

export const retroService = {
  async listBySprint(sprintId: string): Promise<SprintRetroItem[]> {
    const { data, error } = await supabase
      .from('sprint_retro_items')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as SprintRetroItem[]
  },

  async add(item: Omit<SprintRetroItem, 'id' | 'created_at'>): Promise<SprintRetroItem> {
    const { data, error } = await supabase.from('sprint_retro_items').insert(item).select().single()
    if (error) throw error
    return data as SprintRetroItem
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('sprint_retro_items').delete().eq('id', id)
    if (error) throw error
  },
}
