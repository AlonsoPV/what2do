import { supabase } from '@/lib/supabase/client'
import type { Priority, CreatePriorityInput, UpdatePriorityInput, CatalogFilter } from '../types/catalogs.types'

const TABLE = 'priorities'

export const prioritiesService = {
  async list(filter: CatalogFilter = {}): Promise<Priority[]> {
    let q = supabase.from(TABLE).select('*').order('orden').order('nombre')
    if (filter.activo !== undefined && filter.activo !== null) q = q.eq('activo', filter.activo)
    const { data, error } = await q
    if (error) throw error
    let list = (data ?? []) as Priority[]
    if (filter.search?.trim()) {
      const term = filter.search.trim().toLowerCase()
      list = list.filter(p => p.nombre.toLowerCase().includes(term) || (p.descripcion?.toLowerCase().includes(term) ?? false))
    }
    return list
  },

  async getById(id: string): Promise<Priority | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as Priority | null
  },

  async create(input: CreatePriorityInput): Promise<Priority> {
    const { data, error } = await supabase.from(TABLE).insert({
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() ?? null,
      orden: input.orden ?? 0,
      activo: input.activo ?? true,
    }).select().single()
    if (error) throw error
    return data as Priority
  },

  async update(id: string, input: UpdatePriorityInput): Promise<Priority> {
    const existing = await this.getById(id)
    const payload: Record<string, unknown> = { ...input }
    if (payload.nombre !== undefined) payload.nombre = (payload.nombre as string).trim()
    if (payload.descripcion !== undefined) payload.descripcion = (payload.descripcion as string)?.trim() ?? null
    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single()
    if (error) throw error

    const { error: syncError } = await supabase.rpc('sync_acciones_prioridad_for_priority', {
      p_priority_id: id,
    })
    if (syncError) {
      const newNombre = typeof input.nombre === 'string' ? input.nombre.trim() : null
      if (existing && newNombre && newNombre !== existing.nombre) {
        const { error: fallbackError } = await supabase
          .from('acciones_diarias')
          .update({ prioridad: newNombre })
          .eq('prioridad', existing.nombre)
        if (fallbackError) throw fallbackError
      } else if (syncError.code !== 'PGRST202') {
        throw syncError
      }
    }

    return data as Priority
  },

  async setActivo(id: string, activo: boolean): Promise<Priority> {
    return this.update(id, { activo })
  },
}
