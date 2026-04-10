import type { CatalogKpi, CreateKpiInput, UpdateKpiInput } from '../types/catalogs.types'
import type { KpiFormValues } from '../schemas/kpi.schema'

function directionFromCalc(
  calc: KpiFormValues['calc_type']
): 'maximize' | 'minimize' | null {
  if (calc === 'binary') return null
  if (calc === 'maximize') return 'maximize'
  if (calc === 'minimize') return 'minimize'
  return null
}

export function kpiFormValuesToCreateInput(values: KpiFormValues): CreateKpiInput {
  return {
    nombre: values.nombre,
    descripcion: values.descripcion ?? null,
    unidad: values.unidad,
    tipo: values.tipo,
    meta_objetivo: values.meta_objetivo,
    periodicidad: values.periodicidad,
    orden: values.orden,
    activo: values.activo,
    gap_id: values.gap_id,
    weight: values.weight,
    baseline: values.baseline,
    target_m6: values.target_m6,
    target_m12: values.target_m12,
    target_m18: values.target_m18,
    direction: directionFromCalc(values.calc_type),
    calc_type: values.calc_type,
    in_global_portfolio: values.in_global_portfolio,
    threshold_green: values.threshold_green,
    threshold_yellow: values.threshold_yellow,
    owner_usuario: values.owner_usuario,
  }
}

export function kpiFormValuesToUpdateInput(values: KpiFormValues): UpdateKpiInput {
  return kpiFormValuesToCreateInput(values)
}

/** Valores iniciales del formulario desde una fila de catálogo. */
export function catalogKpiToFormValues(row: CatalogKpi): KpiFormValues {
  const calc =
    row.calc_type ??
    (row.direction === 'minimize' ? 'minimize' : row.direction === 'maximize' ? 'maximize' : 'maximize')
  return {
    nombre: row.nombre,
    descripcion: row.descripcion ?? undefined,
    unidad: row.unidad as KpiFormValues['unidad'],
    tipo: row.tipo as KpiFormValues['tipo'],
    meta_objetivo: row.meta_objetivo,
    periodicidad: row.periodicidad as KpiFormValues['periodicidad'],
    orden: row.orden,
    activo: row.activo,
    gap_id: row.gap_id,
    weight: row.weight,
    baseline: row.baseline,
    target_m6: row.target_m6,
    target_m12: row.target_m12,
    target_m18: row.target_m18,
    calc_type: calc as KpiFormValues['calc_type'],
    in_global_portfolio: row.in_global_portfolio,
    threshold_green: row.threshold_green,
    threshold_yellow: row.threshold_yellow,
    owner_usuario: row.owner_usuario,
  }
}
