/**
 * Servicio de acciones diarias (tabla acciones_diarias).
 * Spec §7: CRUD por dueño/admin; filtros por fecha, estado, responsable.
 */

import { supabase } from '@/lib/supabase/client'
import { validateFutureDateTimeCDMX } from '@/lib/futureDateValidation'
import { gapActionsLogService } from '@/services/gapActionsLog.service'
import { listGapIdsForAccion } from '@/services/accionLinks.service'
import { usuariosService } from '@/services/usuarios.service'
import { assertAccionEstadoTransition } from '@/services/accionEstadoValidation.service'
import {
  getAutoEstadoPorFechaCompromiso,
  isEnRetraso,
} from '@/features/operations/utils/accionUtils'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { TipoAccion } from '@/features/operations/utils/tipoAccionConfig'

const TABLE = 'acciones_diarias'
const ACCION_SELECT = [
  'id',
  'fecha',
  'titulo_accion',
  'descripcion_accion',
  'responsable',
  'created_by',
  'updated_by',
  'hora_limite',
  'evidencia_esperada',
  'evidencia_cargada',
  'evidencia_adjunta',
  'estado',
  'kpi_afectado',
  'gap_id',
  'tipo_accion',
  'story_points',
  'catalog_kpi_id',
  'okr_impactado',
  'proceso',
  'area',
  'cliente_id',
  'prioridad',
  'causa_raiz',
  'responsable_bloqueo',
  'escalado',
  'fecha_escalamiento',
  'notas_escalamiento',
  'repeticion',
  'verificador_dato',
  'verificador_gobierno',
  'completed_at',
  'completed_by',
  'verified_at',
  'verified_by',
  'created_at',
  'updated_at',
  'sprint_id',
].join(',')

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
  prioridad?: string | string[]
  area?: string
  responsable?: string
  /** Usuario que creó la acción (usuarios.id). Independiente de `responsable`. */
  created_by?: string
  tipo_accion?: TipoAccion | TipoAccion[]
  sprint_id?: string
  search?: string
}

export interface CalendarActionCountsInput {
  usuarioId: string
  from: string
  to: string
  area?: string
  responsable?: string
  estado?: ActionStatus
}

async function syncEstadosPorFechaCompromiso(list: AccionDiaria[]): Promise<AccionDiaria[]> {
  const changes = list.flatMap((accion) => {
    const next = getAutoEstadoPorFechaCompromiso(accion)
    return next && next !== accion.estado ? [{ accion, next }] : []
  })
  if (changes.length === 0) return list

  const updates = await Promise.all(
    changes.map(({ accion, next }) =>
      supabase.from(TABLE).update({ estado: next }).eq('id', accion.id)
    )
  )

  const failed = updates.find((result) => result.error)
  if (failed?.error) {
    console.error('[acciones] syncEstadosPorFechaCompromiso:', failed.error)
    return list
  }

  const nextById = new Map(changes.map(({ accion, next }) => [accion.id, next]))
  return list.map((accion) => {
    const next = nextById.get(accion.id)
    return next ? { ...accion, estado: next } : accion
  })
}

function normalizeAccionPayload(payload: Partial<AccionDiaria>): Partial<AccionDiaria> {
  const next: Partial<AccionDiaria> = { ...payload }
  if (next.tipo_accion == null) next.tipo_accion = 'operativa'
  if (next.tipo_accion === 'operativa' || next.tipo_accion === 'desbloqueo') {
    next.sprint_id = null
  }
  if (next.tipo_accion === 'sprint' && !next.sprint_id) {
    throw new Error('Una accion de sprint requiere seleccionar sprint.')
  }
  if (next.tipo_accion === 'desbloqueo' && !next.responsable_bloqueo) {
    throw new Error('Un desbloqueo requiere responsable de desbloqueo.')
  }
  return next
}

function escapePostgrestLikeTerm(term: string): string {
  return term.replace(/[%_]/g, (match) => `\\${match}`).replace(/[,()]/g, ' ')
}

export const accionesService = {
  async listByDate(fecha: string): Promise<AccionDiaria[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(ACCION_SELECT)
      .eq('fecha', fecha)
      .order('hora_limite', { ascending: true })
    if (error) throw error
    return syncEstadosPorFechaCompromiso((data ?? []) as unknown as AccionDiaria[])
  },

  async list(filter: AccionesFilter = {}) {
    let q = supabase.from(TABLE).select(ACCION_SELECT)
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
    if (filter.created_by) q = q.eq('created_by', filter.created_by)
    if (filter.tipo_accion) {
      const tipos = Array.isArray(filter.tipo_accion)
        ? filter.tipo_accion
        : [filter.tipo_accion]
      q = q.in('tipo_accion', tipos)
    }
    if (filter.sprint_id) q = q.eq('sprint_id', filter.sprint_id)
    if (filter.search?.trim()) {
      const term = escapePostgrestLikeTerm(filter.search.trim())
      q = q.or(
        `titulo_accion.ilike.%${term}%,descripcion_accion.ilike.%${term}%,evidencia_esperada.ilike.%${term}%`
      )
    }
    q = q.order('hora_limite', { ascending: true })
    const { data, error } = await q
    if (error) throw error
    let list = (data ?? []) as unknown as AccionDiaria[]
    if (onlyRetraso) {
      list = list.filter((a) => a.estado === 'Retraso' || isEnRetraso(a))
    }
    return syncEstadosPorFechaCompromiso(list)
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(ACCION_SELECT)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      throw new Error('No se encontró la acción o no tienes permiso para verla.')
    }
    return data as unknown as AccionDiaria
  },

  /** Títulos y autores para enriquecer notificaciones (batch). */
  async listSummaryByIds(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) {
      return [] as Pick<AccionDiaria, 'id' | 'titulo_accion' | 'descripcion_accion' | 'created_by'>[]
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, titulo_accion, descripcion_accion, created_by')
      .in('id', unique)
    if (error) throw error
    return (data ?? []) as Pick<AccionDiaria, 'id' | 'titulo_accion' | 'descripcion_accion' | 'created_by'>[]
  },

  /**
   * Inserta una acción. No usa .select() para evitar fallos por RLS
   * (si asignas responsable a otro usuario, no podrías leer la fila devuelta).
   * Tras insertar, invalidar la caché de acciones para que el listado se actualice.
   */
  async create(payload: Partial<AccionDiaria>) {
    const cleanPayload = normalizeAccionPayload(payload)
    const futureError = validateFutureDateTimeCDMX(
      cleanPayload.fecha,
      cleanPayload.hora_limite,
      'La fecha y hora limite de la accion'
    )
    if (futureError) throw new Error(futureError)
    const { data, error } = await supabase
      .from(TABLE)
      .insert(cleanPayload)
      .select(ACCION_SELECT)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      throw new Error(
        'La acción se guardó, pero no pudimos leerla con tu perfil. Actualiza el listado o revisa permisos.'
      )
    }
    return data as unknown as AccionDiaria
  },

  async update(id: string, payload: Partial<AccionDiaria>) {
    let prev: AccionDiaria | undefined
    const needsPrev =
      payload.estado !== undefined ||
      payload.tipo_accion !== undefined ||
      payload.sprint_id !== undefined
    if (needsPrev) {
      prev = await this.getById(id)
    }

    const mergedPayload = normalizeAccionPayload(prev ? ({ ...prev, ...payload } as Partial<AccionDiaria>) : payload)
    const cleanPayload: Partial<AccionDiaria> = { ...payload }
    if (payload.tipo_accion !== undefined) cleanPayload.tipo_accion = mergedPayload.tipo_accion
    if (
      payload.sprint_id !== undefined ||
      payload.tipo_accion === 'operativa' ||
      payload.tipo_accion === 'sprint' ||
      payload.tipo_accion === 'desbloqueo'
    ) {
      cleanPayload.sprint_id = mergedPayload.sprint_id ?? null
    }
    const nextEstado = cleanPayload.estado
    if (nextEstado !== undefined && prev) {
      if (nextEstado !== prev.estado) {
        const merged = { ...prev, ...cleanPayload } as AccionDiaria
        await assertAccionEstadoTransition(prev, nextEstado, merged)
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(cleanPayload)
      .eq('id', id)
      .select(ACCION_SELECT)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      throw new Error(
        'No se pudo actualizar la acción. Verifica que seas responsable, creador o administrador.'
      )
    }
    const updated = data as unknown as AccionDiaria

    if (prev && nextEstado !== undefined) {
      await maybeInsertGapActionLog(prev, updated)
    }

    return updated
  },

  async updateEstado(id: string, estado: ActionStatus, extra?: Partial<AccionDiaria>) {
    return this.update(id, { estado, ...extra })
  },

  async calendarCountsByDay(input: CalendarActionCountsInput): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('calendar_action_counts_by_day', {
      p_usuario_id: input.usuarioId,
      p_from: input.from,
      p_to: input.to,
      p_area: input.area || null,
      p_responsable: input.responsable || null,
      p_estado: input.estado || null,
    })
    if (error) throw error

    return ((data ?? []) as Array<{ day: string; action_count: number }>).reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.day] = row.action_count
        return acc
      },
      {}
    )
  },

  async delete(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
