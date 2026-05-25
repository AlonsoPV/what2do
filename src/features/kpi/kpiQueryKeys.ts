import type { QueryClient } from '@tanstack/react-query'

/** Claves React Query alineadas al plan (KPIs ponderados / Gaps O2C). */
export const kpiQueryKeys = {
  gaps: ['gaps'] as const,
  gap: (id: string) => ['gaps', id] as const,
  /** Prefijo: `['gap-acciones', sortedIdsKey]` — invalidar con prefijo `gap-acciones`. */
  gapAcciones: ['gap-acciones'] as const,
  catalogKpis: ['catalog-kpis'] as const,
  catalogKpisByGap: (gapId: string) => ['catalog-kpis', gapId] as const,
  catalogKpiMeasurements: (catalogKpiId: string) => ['catalog-kpi-measurements', catalogKpiId] as const,
  catalogKpiMeasurementsLatestBatch: (stableIdsKey: string) =>
    ['catalog-kpi-measurements', 'latest-batch', stableIdsKey] as const,
  catalogKpiMeasurementsRecentBatch: (stableIdsKey: string, perKpiLimit: number) =>
    ['catalog-kpi-measurements', 'recent-batch', stableIdsKey, perKpiLimit] as const,
  /** Conteo de acciones distintas por KPI (tabla puente + columna `catalog_kpi_id`). */
  catalogKpiAccionImpact: ['catalog-kpi-accion-impact'] as const,
  globalScoreSnapshots: ['global-score-snapshots'] as const,
  strategicNorth: ['strategic-north'] as const,
  fces: ['fce'] as const,
} as const

/** Listas / tableros: datos relativamente estáticos. */
export const KPI_STALE_TIME_LIST_MS = 3 * 60 * 1000

/** Series de mediciones: un poco más frescas. */
export const KPI_STALE_TIME_MEASUREMENTS_MS = 60 * 1000

/**
 * Tras insertar una medición: invalida mediciones de ese KPI, listados de KPIs,
 * KPIs del gap (si aplica) y snapshots globales.
 */
const CATALOGS_KPIS_KEY = ['catalogs', 'kpis'] as const

export function invalidateAfterCatalogKpiMeasurement(
  qc: QueryClient,
  opts: { catalogKpiId: string; gapId?: string | null }
): void {
  qc.invalidateQueries({ queryKey: ['catalog-kpi-measurements'] })
  qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiMeasurements(opts.catalogKpiId) })
  qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpis })
  qc.invalidateQueries({ queryKey: CATALOGS_KPIS_KEY })
  if (opts.gapId) {
    qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpisByGap(opts.gapId) })
  }
  qc.invalidateQueries({ queryKey: kpiQueryKeys.globalScoreSnapshots })
}

/**
 * Tras cambiar una acción vinculada a un gap: invalida gap y KPIs de ese gap.
 */
export function invalidateAfterGapLinkedAction(qc: QueryClient, gapId: string): void {
  qc.invalidateQueries({ queryKey: kpiQueryKeys.gaps })
  qc.invalidateQueries({ queryKey: kpiQueryKeys.gap(gapId) })
  qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpisByGap(gapId) })
  qc.invalidateQueries({ queryKey: kpiQueryKeys.gapAcciones })
}
