import { supabase } from '@/lib/supabase/client'

const GAPS_TABLE = 'accion_gaps'
const KPIS_TABLE = 'accion_catalog_kpis'

export async function fetchAccionGapIds(accionId: string): Promise<string[]> {
  const { data, error } = await supabase.from(GAPS_TABLE).select('gap_id').eq('accion_id', accionId)
  if (error) throw error
  return (data ?? []).map((r) => r.gap_id as string)
}

export async function fetchAccionCatalogKpiIds(accionId: string): Promise<string[]> {
  const { data, error } = await supabase.from(KPIS_TABLE).select('catalog_kpi_id').eq('accion_id', accionId)
  if (error) throw error
  return (data ?? []).map((r) => r.catalog_kpi_id as string)
}

/** Ids de gaps vinculados (puente + columna primaria), sin duplicados. */
export async function listGapIdsForAccion(accionId: string): Promise<string[]> {
  const { data: row, error: e1 } = await supabase
    .from('acciones_diarias')
    .select('gap_id')
    .eq('id', accionId)
    .maybeSingle()
  if (e1) throw e1
  const fromBridge = await fetchAccionGapIds(accionId)
  const set = new Set<string>(fromBridge)
  const primary = row?.gap_id as string | null | undefined
  if (primary) set.add(primary)
  return [...set]
}

/** Sincroniza tablas puente y columnas primarias (primer id) en `acciones_diarias`. */
export async function syncAccionO2cLinks(
  accionId: string,
  opts: { gapIds: string[]; catalogKpiIds: string[] }
): Promise<void> {
  const gapIds = [...new Set(opts.gapIds)]
  const catalogKpiIds = [...new Set(opts.catalogKpiIds)]

  const { error: delG } = await supabase.from(GAPS_TABLE).delete().eq('accion_id', accionId)
  if (delG) throw delG

  if (gapIds.length > 0) {
    const { error: insG } = await supabase.from(GAPS_TABLE).insert(
      gapIds.map((gap_id) => ({ accion_id: accionId, gap_id }))
    )
    if (insG) throw insG
  }

  const { error: delK } = await supabase.from(KPIS_TABLE).delete().eq('accion_id', accionId)
  if (delK) throw delK

  if (catalogKpiIds.length > 0) {
    const { error: insK } = await supabase.from(KPIS_TABLE).insert(
      catalogKpiIds.map((catalog_kpi_id) => ({ accion_id: accionId, catalog_kpi_id }))
    )
    if (insK) throw insK
  }

  const { error: up } = await supabase
    .from('acciones_diarias')
    .update({
      gap_id: gapIds[0] ?? null,
      catalog_kpi_id: catalogKpiIds[0] ?? null,
    })
    .eq('id', accionId)
  if (up) throw up
}
