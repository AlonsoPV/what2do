import { describe, expect, it } from 'vitest'
import type { CatalogKpiO2cRow } from '../types/kpi.types'
import {
  buildKpiMetricFromCatalogRow,
  calculateCompliance,
  calculateGlobalScore,
  globalPortfolioWeightWarning,
  type KpiMetric,
} from './kpiCalculations'
import { normalizeKpiWeightsForEligible } from './o2cScoreEngine'
import { computeGapStoryProgress } from './gapProgress'
import type { AccionDiaria } from '@/types'

function rowPartial(p: Partial<CatalogKpiO2cRow> & Pick<CatalogKpiO2cRow, 'id' | 'nombre'>): CatalogKpiO2cRow {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: null,
    unidad: '%',
    tipo: 'ratio',
    meta_objetivo: null,
    periodicidad: 'mensual',
    orden: 1,
    activo: true,
    created_at: '',
    updated_at: '',
    gap_id: null,
    weight: p.weight ?? 0.5,
    baseline: p.baseline ?? null,
    target_m3: null,
    target_m6: null,
    target_m12: null,
    target_m18: p.target_m18 ?? null,
    direction: p.direction ?? null,
    calc_type: p.calc_type ?? null,
    current_value: p.current_value ?? null,
    in_global_portfolio: p.in_global_portfolio ?? true,
    threshold_green: null,
    threshold_yellow: null,
    owner_usuario: null,
  }
}

describe('normalizeKpiWeightsForEligible', () => {
  it('renormaliza cuando un KPI sin cumplimiento queda fuera', () => {
    const norm = normalizeKpiWeightsForEligible([
      { weight: 0.3, compliance: 0.8 },
      { weight: 0.7, compliance: null },
    ])
    expect(norm[0]).toBeCloseTo(1, 5)
    expect(norm[1]).toBe(0)
  })
})

describe('calculateGlobalScore', () => {
  it('media ponderada solo sobre elegibles', () => {
    const metrics: KpiMetric[] = [
      buildKpiMetricFromCatalogRow(
        rowPartial({
          id: 'a',
          nombre: 'A',
          baseline: 0,
          target_m18: 100,
          calc_type: 'maximize',
          weight: 0.6,
          current_value: 50,
        }),
        50
      ),
      buildKpiMetricFromCatalogRow(
        rowPartial({
          id: 'b',
          nombre: 'B',
          baseline: 0,
          target_m18: 1,
          calc_type: 'maximize',
          weight: 0.4,
          current_value: null,
        }),
        null
      ),
    ]
    const g = calculateGlobalScore(metrics)
    expect(g).toBeCloseTo(0.5, 5)
  })
})

describe('calculateCompliance tipos', () => {
  it('maximize', () => {
    const m = buildKpiMetricFromCatalogRow(
      rowPartial({
        id: 'm',
        nombre: 'M',
        baseline: 0,
        target_m18: 100,
        calc_type: 'maximize',
        current_value: 80,
      }),
      80
    )
    expect(calculateCompliance(m)).toBeCloseTo(0.8, 5)
  })

  it('minimize', () => {
    const m = buildKpiMetricFromCatalogRow(
      rowPartial({
        id: 'n',
        nombre: 'N',
        baseline: 100,
        target_m18: 40,
        calc_type: 'minimize',
        current_value: 70,
      }),
      70
    )
    expect(calculateCompliance(m)).toBeCloseTo(0.5, 5)
  })

  it('binary', () => {
    const m = buildKpiMetricFromCatalogRow(
      rowPartial({
        id: 'b',
        nombre: 'B',
        baseline: 0,
        target_m18: 99,
        calc_type: 'binary',
        current_value: 99,
      }),
      99
    )
    expect(calculateCompliance(m)).toBe(1)
  })
})

describe('globalPortfolioWeightWarning', () => {
  it('devuelve mensaje si la suma declarada no es 1', () => {
    const msg = globalPortfolioWeightWarning(0.92, 3)
    expect(msg).toContain('0.9200')
    expect(msg).toContain('espera 1')
  })

  it('null si no hay KPIs en el conjunto filtrado', () => {
    expect(globalPortfolioWeightWarning(2, 0)).toBeNull()
  })

  it('null si la suma está en tolerancia', () => {
    expect(globalPortfolioWeightWarning(1, 8)).toBeNull()
  })
})

describe('computeGapStoryProgress', () => {
  it('usa story points Hecho / Verificado', () => {
    const acciones = [
      {
        id: '1',
        gap_id: 'g1',
        estado: 'Hecho',
        story_points: 5,
      },
      {
        id: '2',
        gap_id: 'g1',
        estado: 'En Progreso',
        story_points: 5,
      },
    ] as unknown as AccionDiaria[]
    const r = computeGapStoryProgress('g1', acciones, 0)
    expect(r.totalPoints).toBe(10)
    expect(r.donePoints).toBe(5)
  })
})
