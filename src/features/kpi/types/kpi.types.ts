/** Alineado a enum `gap_status` en Supabase. */
export type GapStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

/** Fila `gaps`. */
export interface Gap {
  id: string
  nombre: string
  descripcion: string | null
  prioridad: string | null
  status: GapStatus
  area: string | null
  owner_usuario: string | null
  /** Factor crítico de éxito (mapa estratégico nivel 2); ausente hasta aplicar migración FCE. */
  fce_id?: string | null
  total_story_points: number
  activo: boolean
  created_at: string
  updated_at: string
}

/** Nivel 1 — norte estratégico (`strategic_north`). */
export interface StrategicNorthRow {
  id: string
  mision: string
  vision: string
  valores: string | null
  bhag: string
  bhag_anio: number
  updated_at: string
}

/** Nivel 2 — FCE (`fce`). */
export interface FceRow {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  icono: string | null
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

/** Dirección O2C; coincide con `catalog_kpi_direction`. */
export type CatalogKpiDirectionDb = 'maximize' | 'minimize'

/** Tipo de cálculo de negocio; coincide con `catalog_kpi_calc_type`. */
export type CatalogKpiCalcTypeDb = 'minimize' | 'maximize' | 'binary'

/**
 * Fila completa `catalog_kpis` incluyendo columnas O2C (ponderación, baseline, etc.).
 */
export interface CatalogKpiO2cRow {
  id: string
  nombre: string
  descripcion: string | null
  unidad: string
  tipo: string
  meta_objetivo: number | null
  periodicidad: string
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
  gap_id: string | null
  weight: number | null
  baseline: number | null
  /** Meta mes 3 (programa O2C); opcional. Ver docs/KPIs.md y `resolveMdActiveTarget`. */
  target_m3: number | null
  target_m6: number | null
  target_m12: number | null
  target_m18: number | null
  direction: CatalogKpiDirectionDb | null
  /** Preferido sobre `direction` para cumplimiento (maximize | minimize | binary). */
  calc_type: CatalogKpiCalcTypeDb | null
  current_value: number | null
  in_global_portfolio: boolean
  threshold_green: number | null
  threshold_yellow: number | null
  owner_usuario: string | null
}

/** Fila `catalog_kpi_measurements`. */
export interface CatalogKpiMeasurement {
  id: string
  catalog_kpi_id: string
  medido_en: string
  valor: number
  fuente: string | null
  notes: string | null
  measured_by: string | null
  created_at: string
}

/** Fila `global_score_snapshots`. */
export interface GlobalScoreSnapshot {
  id: string
  score: number
  metadata: Record<string, unknown> | null
  created_at: string
}

export type GapsListFilters = {
  activo?: boolean
  status?: GapStatus
  area?: string
}

export type CatalogKpisO2cListOpts = {
  /** Si se pasa, solo KPIs de ese gap. */
  gapId?: string | null
  activo?: boolean | null
  /** Solo KPIs marcados para el portafolio global (y con gap). */
  inGlobalPortfolio?: boolean
}
