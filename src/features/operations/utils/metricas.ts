/**
 * Cálculo de métricas del dashboard a partir de lista de acciones (spec §4.1).
 */

import type { AccionDiaria } from '@/types'
import { isEnRetraso } from './accionUtils'

export interface MetricasAcciones {
  total: number
  completadas: number
  bloqueadas: number
  retraso: number
  eficienciaPorcentaje: number
}

export function metricasFromAcciones(acciones: AccionDiaria[]): MetricasAcciones {
  const total = acciones.length
  const completadas = acciones.filter((a) => a.estado === 'Completada').length
  const bloqueadas = acciones.filter((a) => a.estado === 'En_Pausa').length
  const retraso = acciones.filter((a) => a.estado === 'Retrasa' || isEnRetraso(a)).length
  const eficienciaPorcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0

  return {
    total,
    completadas,
    bloqueadas,
    retraso,
    eficienciaPorcentaje,
  }
}
