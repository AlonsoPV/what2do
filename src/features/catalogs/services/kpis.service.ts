import { supabase } from '@/lib/supabase/client'
import type { CatalogKpi, CreateKpiInput, UpdateKpiInput, CatalogFilter } from '../types/catalogs.types'

const TABLE = 'catalog_kpis'

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

export const catalogKpisService = {
  async list(filter: CatalogFilter = {}): Promise<CatalogKpi[]> {
    let q = supabase.from(TABLE).select('*').order('orden').order('nombre')
    if (filter.activo !== undefined && filter.activo !== null) q = q.eq('activo', filter.activo)
    if (filter.gap_id) q = q.eq('gap_id', filter.gap_id)
    if (filter.calc_type) q = q.eq('calc_type', filter.calc_type)
    if (filter.globalPortfolioMembersOnly === true) {
      q = q.eq('in_global_portfolio', true).not('gap_id', 'is', null)
    }
    const { data, error } = await q
    if (error) throw error
    let list = (data ?? []) as CatalogKpi[]
    if (filter.search?.trim()) {
      const term = filter.search.trim().toLowerCase()
      list = list.filter(
        (k) =>
          k.nombre.toLowerCase().includes(term) ||
          (k.descripcion?.toLowerCase().includes(term) ?? false)
      )
    }
    return list
  },

  async getById(id: string): Promise<CatalogKpi | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as CatalogKpi | null
  },

  async create(input: CreateKpiInput): Promise<CatalogKpi> {
    const payload = stripUndefined({
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() ?? null,
      unidad: input.unidad ?? 'porcentaje',
      tipo: input.tipo ?? 'manual',
      meta_objetivo: input.meta_objetivo ?? null,
      periodicidad: input.periodicidad ?? 'mensual',
      orden: input.orden ?? 0,
      activo: input.activo ?? true,
      gap_id: input.gap_id ?? null,
      weight: input.weight ?? null,
      baseline: input.baseline ?? null,
      target_m6: input.target_m6 ?? null,
      target_m12: input.target_m12 ?? null,
      target_m18: input.target_m18 ?? null,
      direction: input.direction ?? null,
      calc_type: input.calc_type ?? null,
      current_value: input.current_value ?? null,
      in_global_portfolio: input.in_global_portfolio ?? true,
      threshold_green: input.threshold_green ?? null,
      threshold_yellow: input.threshold_yellow ?? null,
      owner_usuario: input.owner_usuario ?? null,
    } as Record<string, unknown>)

    const { data, error } = await supabase.from(TABLE).insert(payload).select().single()
    if (error) throw error
    return data as CatalogKpi
  },

  async update(id: string, input: UpdateKpiInput): Promise<CatalogKpi> {
    const payload = stripUndefined({
      ...input,
      nombre: input.nombre !== undefined ? input.nombre.trim() : undefined,
      descripcion:
        input.descripcion !== undefined ? input.descripcion?.trim() ?? null : undefined,
    } as Record<string, unknown>)

    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single()
    if (error) throw error
    return data as CatalogKpi
  },

  async setActivo(id: string, activo: boolean): Promise<CatalogKpi> {
    return this.update(id, { activo })
  },
}
