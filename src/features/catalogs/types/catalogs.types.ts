/**
 * Tipos para el módulo de Catálogos / Configuración.
 * Alineados con tablas: catalog_roles, areas, statuses, priorities,
 * dropdown_catalogs, dropdown_options, catalog_kpis.
 *
 * Para dependencias entre catálogos (ej. usuarios → catalog_roles, areas)
 * ver lib/catalog-registry.ts y docs/catalogs-evolution.md.
 */

import type { CatalogKpiO2cRow } from '@/features/kpi/types/kpi.types'

/** Base para ítems de catálogo con activo (permite reutilizar componentes genéricos) */
export interface CatalogItemWithActivo {
  id: string
  nombre: string
  activo: boolean
  created_at: string
  updated_at: string
}

// ---- Catalog Roles ----
export interface CatalogRole {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateRoleInput {
  nombre: string
  descripcion?: string | null
  activo?: boolean
}

export interface UpdateRoleInput {
  nombre?: string
  descripcion?: string | null
  activo?: boolean
}

// ---- Areas ----
export interface Area {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateAreaInput {
  nombre: string
  descripcion?: string | null
  activo?: boolean
}

export interface UpdateAreaInput {
  nombre?: string
  descripcion?: string | null
  activo?: boolean
}

// ---- Statuses ----
export interface Status {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  orden: number
  es_cierre: boolean
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateStatusInput {
  nombre: string
  descripcion?: string | null
  color?: string | null
  orden?: number
  es_cierre?: boolean
  activo?: boolean
}

export interface UpdateStatusInput {
  nombre?: string
  descripcion?: string | null
  color?: string | null
  orden?: number
  es_cierre?: boolean
  activo?: boolean
}

// ---- Priorities ----
export interface Priority {
  id: string
  nombre: string
  descripcion: string | null
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreatePriorityInput {
  nombre: string
  descripcion?: string | null
  orden?: number
  activo?: boolean
}

export interface UpdatePriorityInput {
  nombre?: string
  descripcion?: string | null
  orden?: number
  activo?: boolean
}

// ---- Dropdown Catalogs ----
export interface DropdownCatalog {
  id: string
  key: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateDropdownCatalogInput {
  key: string
  nombre: string
  descripcion?: string | null
  activo?: boolean
}

export interface UpdateDropdownCatalogInput {
  key?: string
  nombre?: string
  descripcion?: string | null
  activo?: boolean
}

// ---- Dropdown Options ----
export interface DropdownOption {
  id: string
  catalog_id: string
  label: string
  value: string
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateDropdownOptionInput {
  catalog_id: string
  label: string
  value: string
  orden?: number
  activo?: boolean
}

export interface UpdateDropdownOptionInput {
  label?: string
  value?: string
  orden?: number
  activo?: boolean
}

// ---- Catalog KPIs ----
export type KpiUnit = 'porcentaje' | 'numero' | 'dias' | 'moneda' | 'horas' | 'cantidad'
export type KpiType = 'manual' | 'calculado' | 'informativo'
export type KpiPeriodicity = 'diaria' | 'semanal' | 'mensual' | 'trimestral' | 'anual'
export type CatalogKpiCalcType = 'minimize' | 'maximize' | 'binary'

/** Fila completa de `catalog_kpis` (catálogo + negocio O2C). */
export type CatalogKpi = CatalogKpiO2cRow

export interface CreateKpiInput {
  nombre: string
  descripcion?: string | null
  unidad?: string
  tipo?: string
  meta_objetivo?: number | null
  periodicidad?: string
  orden?: number
  activo?: boolean
  gap_id?: string | null
  weight?: number | null
  baseline?: number | null
  target_m6?: number | null
  target_m12?: number | null
  target_m18?: number | null
  direction?: 'maximize' | 'minimize' | null
  calc_type?: CatalogKpiCalcType | null
  current_value?: number | null
  in_global_portfolio?: boolean
  threshold_green?: number | null
  threshold_yellow?: number | null
  owner_usuario?: string | null
}

export interface UpdateKpiInput {
  nombre?: string
  descripcion?: string | null
  unidad?: string
  tipo?: string
  meta_objetivo?: number | null
  periodicidad?: string
  orden?: number
  activo?: boolean
  gap_id?: string | null
  weight?: number | null
  baseline?: number | null
  target_m6?: number | null
  target_m12?: number | null
  target_m18?: number | null
  direction?: 'maximize' | 'minimize' | null
  calc_type?: CatalogKpiCalcType | null
  current_value?: number | null
  in_global_portfolio?: boolean
  threshold_green?: number | null
  threshold_yellow?: number | null
  owner_usuario?: string | null
}

// ---- Filtros genéricos ----
export interface CatalogFilter {
  search?: string
  activo?: boolean | null
  gap_id?: string | null
  calc_type?: CatalogKpiCalcType | null
  /** Solo KPIs activos en portafolio global con `gap_id` (misma regla que listados O2C). */
  globalPortfolioMembersOnly?: boolean
}
