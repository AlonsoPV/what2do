import { supabase } from '@/lib/supabase/client'
import type { CatalogKpiMeasurement } from '../types/kpi.types'

const TABLE = 'catalog_kpi_measurements'
const TABLE_KPIS = 'catalog_kpis'

export type InsertCatalogKpiMeasurementInput = {
  catalog_kpi_id: string
  valor: number
  medido_en?: string
  fuente?: string | null
  notes?: string | null
  measured_by?: string | null
}

/**
 * Inserta medición y actualiza `catalog_kpis.current_value` al mismo valor (fuente única + cache).
 */
export async function insertCatalogKpiMeasurement(
  input: InsertCatalogKpiMeasurementInput
): Promise<CatalogKpiMeasurement> {
  const payload = {
    catalog_kpi_id: input.catalog_kpi_id,
    valor: input.valor,
    medido_en: input.medido_en ?? new Date().toISOString(),
    fuente: input.fuente ?? null,
    notes: input.notes ?? null,
    measured_by: input.measured_by ?? null,
  }
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single()
  if (error) throw error

  const { error: upErr } = await supabase
    .from(TABLE_KPIS)
    .update({ current_value: input.valor })
    .eq('id', input.catalog_kpi_id)
  if (upErr) throw upErr

  return data as CatalogKpiMeasurement
}

export type MeasurementsListOpts = {
  /** Máximo de filas (orden descendente por medido_en). */
  limit?: number
}

/**
 * Historial de mediciones para un KPI de catálogo O2C (más reciente primero).
 */
export async function listMeasurementsByCatalogKpiId(
  catalogKpiId: string,
  opts: MeasurementsListOpts = {}
): Promise<CatalogKpiMeasurement[]> {
  const limit = opts.limit ?? 500
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('catalog_kpi_id', catalogKpiId)
    .order('medido_en', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as CatalogKpiMeasurement[]
}

/** Última medición (o null). */
export async function getLatestMeasurement(catalogKpiId: string): Promise<CatalogKpiMeasurement | null> {
  const rows = await listMeasurementsByCatalogKpiId(catalogKpiId, { limit: 1 })
  return rows[0] ?? null
}

const BATCH_FETCH_MAX = 8000

/**
 * Última medición por KPI en una sola lectura (orden global por fecha; primera por id gana).
 */
export async function listLatestMeasurementsForCatalogKpiIds(
  catalogKpiIds: string[]
): Promise<Map<string, CatalogKpiMeasurement>> {
  const unique = [...new Set(catalogKpiIds)].filter(Boolean)
  const out = new Map<string, CatalogKpiMeasurement>()
  if (unique.length === 0) return out

  const dynamicLimit = Math.max(BATCH_FETCH_MAX, unique.length * 3)
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('catalog_kpi_id', unique)
    .order('medido_en', { ascending: false })
    .limit(dynamicLimit)

  if (error) throw error
  for (const raw of data ?? []) {
    const row = raw as CatalogKpiMeasurement
    const id = row.catalog_kpi_id
    if (!out.has(id)) out.set(id, row)
  }
  return out
}

/**
 * Hasta `perKpiLimit` mediciones más recientes por KPI (p. ej. tendencia vs medición anterior).
 */
export async function listRecentMeasurementsPerKpi(
  catalogKpiIds: string[],
  perKpiLimit: number
): Promise<Map<string, CatalogKpiMeasurement[]>> {
  const unique = [...new Set(catalogKpiIds)].filter(Boolean)
  const out = new Map<string, CatalogKpiMeasurement[]>()
  if (unique.length === 0 || perKpiLimit <= 0) return out

  const dynamicLimit = Math.max(BATCH_FETCH_MAX, unique.length * Math.max(perKpiLimit, 2))
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('catalog_kpi_id', unique)
    .order('medido_en', { ascending: false })
    .limit(dynamicLimit)

  if (error) throw error
  for (const raw of data ?? []) {
    const row = raw as CatalogKpiMeasurement
    const id = row.catalog_kpi_id
    const arr = out.get(id) ?? []
    if (arr.length < perKpiLimit) {
      arr.push(row)
      out.set(id, arr)
    }
  }
  return out
}
