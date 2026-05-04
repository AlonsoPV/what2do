/**
 * Servicio de acciones diarias (tabla acciones_diarias).
 * Spec §7: CRUD por dueño/admin; filtros por fecha, estado, responsable.
 */

import { supabase } from '@/lib/supabase/client'
import { gapActionsLogService } from '@/services/gapActionsLog.service'
import { listGapIdsForAccion } from '@/services/accionLinks.service'
import { usuariosService } from '@/services/usuarios.service'
import { assertAccionEstadoTransition } from '@/services/accionEstadoValidation.service'
import type { AccionDiaria, ActionStatus, PrioridadNc } from '@/types'

function isEnRetraso(a: AccionDiaria): boolean {
  if (a.estado === 'Hecho' || a.estado === 'Verificado') return false
  const hora = a.hora_limite?.slice(0, 5) ?? '23:59'
  const limite = new Date(`${a.fecha}T${hora}:00`)
  return limite.getTime() < Date.now()
}

const TABLE = 'acciones_diarias'

function isDoneEstado(s: ActionStatus): boolean {
  return s === 'Hecho' || s === 'Verificado'
}

async function resolveCurrentUsuarioId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser()
  const authId = auth.user?.id
  if (!authId) return null
  const u = await usuariosService.getByAuthId(authId)
  return u?.id ?? null
}

/**
 * Tras cerrar/verificar: registra evento en gap_actions_log si hay gap_id (sin tocar mediciones KPI).
 * Fallos de auditoría no revierten el update de la acción.
 */
async function maybeInsertGapActionLog(prev: AccionDiaria, updated: AccionDiaria): Promise<void> {
  const next = updated.estado
  let eventType: 'action_completed' | 'action_verified' | null = null
  if (!isDoneEstado(prev.estado) && isDoneEstado(next)) {
    eventType = 'action_completed'
  } else if (prev.estado === 'Hecho' && next === 'Verificado') {
    eventType = 'action_verified'
  }
  if (!eventType) return

  let gapIds: string[] = []
  try {
    gapIds = await listGapIdsForAccion(updated.id)
  } catch (e) {
    console.error('[acciones] listGapIdsForAccion:', e)
    gapIds = updated.gap_id ? [updated.gap_id] : []
  }
  if (gapIds.length === 0) return

  try {
    const createdBy = await resolveCurrentUsuarioId()
    for (const gapId of gapIds) {
      await gapActionsLogService.insertEvent({
        gapId,
        accionId: updated.id,
        eventType,
        createdBy,
        payload: { previous_estado: prev.estado, estado: next },
      })
    }
  } catch (err) {
    console.error('[acciones] gap_actions_log:', err)
  }
}

export interface AccionesFilter {
  /** Fecha "hasta": se muestran acciones creadas en o antes de este día (visible desde el día de creación y todos los días siguientes). */
  fecha_creacion?: string // YYYY-MM-DD
  /** Fecha límite (campo fecha de la acción). Un solo día. */
  fecha?: string
  /** Rango: fecha de la acción >= fecha_min (YYYY-MM-DD). Útil para calendario. */
  fecha_min?: string
  /** Rango: fecha de la acción <= fecha_max (YYYY-MM-DD). Útil para calendario. */
  fecha_max?: string
  /**
   * Calendario: acciones creadas en o antes de este día (fin del último día visible de la grilla).
   * No filtra por `fecha` (límite operativo); se combina con excluir_estados (p. ej. Verificado).
   */
  calendario_creadas_hasta?: string // YYYY-MM-DD
  estado?: ActionStatus | ActionStatus[]
  /** Estados a excluir (ej. Verificado para calendario: mostrar solo activas). */
  excluir_estados?: ActionStatus[]
  prioridad?: PrioridadNc | PrioridadNc[]
  area?: string
  responsable?: string
  search?: string
}

export const accionesService = {
  async listByDate(fecha: string): Promise<AccionDiaria[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('fecha', fecha)
      .order('hora_limite', { ascending: true })
    if (error) throw error
    return (data ?? []) as AccionDiaria[]
  },

  async list(filter: AccionesFilter = {}) {
    let q = supabase.from(TABLE).select('*')
    // Acciones creadas en o antes de esta fecha (visibles desde el día de creación y todos los días siguientes).
    // Límite: medianoche UTC del día siguiente a fecha_creacion (la fecha se interpreta como día en UTC).
    if (filter.fecha_creacion) {
      const next = new Date(filter.fecha_creacion + 'T00:00:00Z')
      next.setUTCDate(next.getUTCDate() + 1)
      const nextStr = next.toISOString().slice(0, 10)
      q = q.lt('created_at', `${nextStr}T00:00:00`)
    }
    if (filter.calendario_creadas_hasta) {
      q = q.lte('created_at', `${filter.calendario_creadas_hasta}T23:59:59.999Z`)
    }
    if (filter.fecha_min) q = q.gte('fecha', filter.fecha_min)
    if (filter.fecha_max) q = q.lte('fecha', filter.fecha_max)
    if (filter.fecha && !filter.fecha_min && !filter.fecha_max) q = q.eq('fecha', filter.fecha)
    // Filtro por estado. Si es solo "Retraso", no filtrar por estado en BD y filtrar después por (estado Retraso o isEnRetraso) para coincidir con la columna Kanban.
    const estadoFilter = filter.estado
      ? Array.isArray(filter.estado)
        ? filter.estado
        : [filter.estado]
      : []
    const onlyRetraso = estadoFilter.length === 1 && estadoFilter[0] === 'Retraso'
    if (estadoFilter.length > 0 && !onlyRetraso) {
      q = q.in('estado', estadoFilter)
    }
    if (filter.excluir_estados?.length) {
      q = q.not('estado', 'in', `(${filter.excluir_estados.map((e) => `"${e}"`).join(',')})`)
    }
    if (filter.prioridad) {
      const prioridades = Array.isArray(filter.prioridad)
        ? filter.prioridad
        : [filter.prioridad]
      q = q.in('prioridad', prioridades)
    }
    if (filter.area != null && filter.area !== '') q = q.eq('area', filter.area)
    if (filter.responsable) q = q.eq('responsable', filter.responsable)
    q = q.order('hora_limite', { ascending: true })
    const { data, error } = await q
    if (error) throw error
    let list = (data ?? []) as AccionDiaria[]
    if (onlyRetraso) {
      list = list.filter((a) => a.estado === 'Retraso' || isEnRetraso(a))
    }
    // Búsqueda por texto: título, descripción y evidencia esperada (insensible a mayúsculas, parcial).
    if (filter.search?.trim()) {
      const term = filter.search.trim().toLowerCase()
      list = list.filter(
        (a) =>
          (a.titulo_accion?.toLowerCase().includes(term) ?? false) ||
          a.descripcion_accion.toLowerCase().includes(term) ||
          (a.evidencia_esperada?.toLowerCase().includes(term) ?? false)
      )
    }
    return list
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as AccionDiaria
  },

  /**
   * Inserta una acción. No usa .select() para evitar fallos por RLS
   * (si asignas responsable a otro usuario, no podrías leer la fila devuelta).
   * Tras insertar, invalidar la caché de acciones para que el listado se actualice.
   */
  async create(payload: Partial<AccionDiaria>) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as AccionDiaria
  },

  async update(id: string, payload: Partial<AccionDiaria>) {
    let prev: AccionDiaria | undefined
    const nextEstado = payload.estado
    if (nextEstado !== undefined) {
      prev = await this.getById(id)
      if (nextEstado !== prev.estado) {
        const merged = { ...prev, ...payload } as AccionDiaria
        await assertAccionEstadoTransition(prev, nextEstado, merged)
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const updated = data as AccionDiaria

    if (prev && nextEstado !== undefined) {
      await maybeInsertGapActionLog(prev, updated)
    }

    return updated
  },

  async updateEstado(id: string, estado: ActionStatus, extra?: Partial<AccionDiaria>) {
    return this.update(id, { estado, ...extra })
  },

  async delete(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
