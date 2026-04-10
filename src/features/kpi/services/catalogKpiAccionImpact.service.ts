import { supabase } from '@/lib/supabase/client'

/**
 * Número de acciones distintas que impactan cada KPI de catálogo:
 * filas en `accion_catalog_kpis` más acciones con `catalog_kpi_id` (legacy / primario) sin duplicar.
 */
export async function fetchCatalogKpiAccionImpactCounts(): Promise<Record<string, number>> {
  const [bridge, primary] = await Promise.all([
    supabase.from('accion_catalog_kpis').select('catalog_kpi_id, accion_id'),
    supabase.from('acciones_diarias').select('id, catalog_kpi_id').not('catalog_kpi_id', 'is', null),
  ])
  if (bridge.error) throw bridge.error
  if (primary.error) throw primary.error

  const byKpi = new Map<string, Set<string>>()
  function add(kpiId: string, accionId: string) {
    let set = byKpi.get(kpiId)
    if (!set) {
      set = new Set<string>()
      byKpi.set(kpiId, set)
    }
    set.add(accionId)
  }

  for (const r of bridge.data ?? []) {
    const kid = r.catalog_kpi_id as string
    const aid = r.accion_id as string
    if (kid && aid) add(kid, aid)
  }
  for (const r of primary.data ?? []) {
    const kid = r.catalog_kpi_id as string | null
    const aid = r.id as string
    if (kid && aid) add(kid, aid)
  }

  const out: Record<string, number> = {}
  for (const [kpiId, set] of byKpi) {
    out[kpiId] = set.size
  }
  return out
}
