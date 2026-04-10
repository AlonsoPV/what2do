import { supabase } from '@/lib/supabase/client'
import type { AccionDiaria } from '@/types'

const TABLE = 'acciones_diarias'
const ACCION_GAPS = 'accion_gaps'

export type AccionesForGapsResult = {
  acciones: AccionDiaria[]
  /** Por cada gap, ids de acciones vinculadas solo por tabla puente (excluye filtro por columna gap_id). */
  junctionAccionIdsByGap: Map<string, Set<string>>
}

/**
 * Acciones vinculadas a uno o más gaps: columna `gap_id` y/o tabla `accion_gaps`.
 */
export async function listAccionesForGapIds(gapIds: string[]): Promise<AccionesForGapsResult> {
  if (gapIds.length === 0) return { acciones: [], junctionAccionIdsByGap: new Map() }

  const { data: legacyRows, error: e1 } = await supabase
    .from(TABLE)
    .select('*')
    .in('gap_id', gapIds)
    .order('fecha', { ascending: false })
  if (e1) throw e1
  const legacy = (legacyRows ?? []) as AccionDiaria[]

  const { data: links, error: e2 } = await supabase
    .from(ACCION_GAPS)
    .select('accion_id, gap_id')
    .in('gap_id', gapIds)
  if (e2) throw e2

  const junctionAccionIdsByGap = new Map<string, Set<string>>()
  const extraAccionIds = new Set<string>()
  for (const row of links ?? []) {
    const gid = row.gap_id as string
    const aid = row.accion_id as string
    if (!junctionAccionIdsByGap.has(gid)) junctionAccionIdsByGap.set(gid, new Set())
    junctionAccionIdsByGap.get(gid)!.add(aid)
    extraAccionIds.add(aid)
  }

  const legacyIds = new Set(legacy.map((a) => a.id))
  const missingIds = [...extraAccionIds].filter((id) => !legacyIds.has(id))

  let extraRows: AccionDiaria[] = []
  if (missingIds.length > 0) {
    const { data: extra, error: e3 } = await supabase.from(TABLE).select('*').in('id', missingIds)
    if (e3) throw e3
    extraRows = (extra ?? []) as AccionDiaria[]
  }

  const byId = new Map<string, AccionDiaria>()
  for (const a of legacy) byId.set(a.id, a)
  for (const a of extraRows) if (!byId.has(a.id)) byId.set(a.id, a)
  const acciones = [...byId.values()].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))

  return { acciones, junctionAccionIdsByGap }
}
