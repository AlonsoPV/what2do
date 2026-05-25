import { supabase } from '@/lib/supabase/client'
import type { Gap, GapStatus, GapsListFilters } from '../types/kpi.types'

const TABLE = 'gaps'

export type CreateGapInput = {
  nombre: string
  descripcion?: string | null
  prioridad?: string | null
  status?: GapStatus
  area?: string | null
  owner_usuario?: string | null
  fce_id?: string | null
  total_story_points?: number
  activo?: boolean
}

export type UpdateGapInput = Partial<CreateGapInput>

export async function listGaps(filters: GapsListFilters = {}): Promise<Gap[]> {
  let q = supabase.from(TABLE).select('*').order('nombre', { ascending: true })

  if (filters.activo !== undefined) {
    q = q.eq('activo', filters.activo)
  }
  if (filters.status !== undefined) {
    q = q.eq('status', filters.status)
  }
  if (filters.area !== undefined && filters.area !== '') {
    q = q.eq('area', filters.area)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Gap[]
}

export async function getGapById(id: string): Promise<Gap | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Gap | null
}

export async function createGap(input: CreateGapInput): Promise<Gap> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() ? input.descripcion.trim() : null,
      prioridad: input.prioridad?.trim() ? input.prioridad.trim() : null,
      status: input.status ?? 'open',
      area: input.area?.trim() ? input.area.trim() : null,
      owner_usuario: input.owner_usuario ?? null,
      fce_id: input.fce_id ?? null,
      total_story_points: input.total_story_points ?? 0,
      activo: input.activo ?? true,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Gap
}

export async function updateGap(id: string, input: UpdateGapInput): Promise<Gap> {
  const patch: Record<string, unknown> = {}
  if (input.nombre !== undefined) patch.nombre = input.nombre.trim()
  if (input.descripcion !== undefined) {
    patch.descripcion = input.descripcion?.trim() ? input.descripcion.trim() : null
  }
  if (input.prioridad !== undefined) {
    patch.prioridad = input.prioridad?.trim() ? input.prioridad.trim() : null
  }
  if (input.status !== undefined) patch.status = input.status
  if (input.area !== undefined) patch.area = input.area?.trim() ? input.area.trim() : null
  if (input.owner_usuario !== undefined) patch.owner_usuario = input.owner_usuario
  if (input.fce_id !== undefined) patch.fce_id = input.fce_id
  if (input.total_story_points !== undefined) patch.total_story_points = input.total_story_points
  if (input.activo !== undefined) patch.activo = input.activo

  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as Gap
}

export async function setGapActivo(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ activo }).eq('id', id)
  if (error) throw error
}
