import { catalogKpisService } from '@/features/catalogs/services/kpis.service'
import type { CatalogFilter } from '@/features/catalogs/types/catalogs.types'
import type { CatalogKpiO2cRow, CatalogKpisO2cListOpts } from '../types/kpi.types'

/**
 * Lista KPIs O2C — delega en `catalogKpisService` (una sola implementación contra `catalog_kpis`).
 */
export async function listCatalogKpisO2c(opts: CatalogKpisO2cListOpts = {}): Promise<CatalogKpiO2cRow[]> {
  const filter: CatalogFilter = {}
  if (opts.gapId !== undefined && opts.gapId !== null && opts.gapId !== '') {
    filter.gap_id = opts.gapId
  }
  if (opts.activo !== undefined && opts.activo !== null) {
    filter.activo = opts.activo
  }
  if (opts.inGlobalPortfolio === true) {
    filter.globalPortfolioMembersOnly = true
  }
  const rows = await catalogKpisService.list(filter)
  return rows as CatalogKpiO2cRow[]
}

export async function getCatalogKpiO2cById(id: string): Promise<CatalogKpiO2cRow | null> {
  const row = await catalogKpisService.getById(id)
  return row as CatalogKpiO2cRow | null
}
