import assert from 'node:assert/strict'
import {
  DEFAULT_O2C_TARGET_HORIZON,
  calculateCompliance,
  calculateGlobalScore,
  calculateWeightedScore,
  deriveGlobalPortfolioFromMetricItems,
  globalPortfolioWeightWarning,
  type KpiMetric,
} from '../src/features/kpi/utils/kpiCalculations.ts'

function m(partial: Partial<KpiMetric>): KpiMetric {
  return {
    id: partial.id ?? 'kpi',
    baseline: partial.baseline ?? null,
    target_m6: partial.target_m6 ?? null,
    target_m12: partial.target_m12 ?? null,
    target_m18: partial.target_m18 ?? null,
    calc_type: partial.calc_type ?? null,
    direction: partial.direction ?? null,
    weight: partial.weight ?? null,
    current: partial.current ?? null,
    threshold_green: partial.threshold_green ?? null,
    threshold_yellow: partial.threshold_yellow ?? null,
  }
}

// maximize
assert.equal(
  calculateCompliance(
    m({ calc_type: 'maximize', baseline: 50, current: 80, target_m18: 100 }),
    { targetHorizon: DEFAULT_O2C_TARGET_HORIZON }
  ),
  0.6
)

// minimize
assert.equal(
  calculateCompliance(
    m({ calc_type: 'minimize', baseline: 100, current: 60, target_m18: 20 }),
    { targetHorizon: DEFAULT_O2C_TARGET_HORIZON }
  ),
  0.5
)

// binary
assert.equal(calculateCompliance(m({ calc_type: 'binary', current: 1, target_m18: 1 })), 1)
assert.equal(calculateCompliance(m({ calc_type: 'binary', current: 0, target_m18: 1 })), 0)

// baseline == target (sin división entre cero)
assert.equal(
  calculateCompliance(m({ calc_type: 'maximize', baseline: 10, target_m18: 10, current: 10 })),
  1
)
assert.equal(
  calculateCompliance(m({ calc_type: 'minimize', baseline: 10, target_m18: 10, current: 12 })),
  0
)

// weighted score / global score
assert.ok(Math.abs((calculateWeightedScore(0.75, 0.2) ?? 0) - 0.15) < 1e-9)
const g = calculateGlobalScore([
  m({ calc_type: 'maximize', baseline: 0, current: 50, target_m18: 100, weight: 0.4 }),
  m({ calc_type: 'maximize', baseline: 0, current: 100, target_m18: 100, weight: 0.6 }),
])
assert.equal(g, 0.8)

// warning de pesos
assert.equal(globalPortfolioWeightWarning(1.0, 3), null)
assert.ok(globalPortfolioWeightWarning(0.95, 3))

// cobertura del portafolio
const derived = deriveGlobalPortfolioFromMetricItems([
  {
    row: { activo: true, gap_id: 'g1', in_global_portfolio: true, weight: 0.5 },
    metric: m({ calc_type: 'maximize', baseline: 0, current: 100, target_m18: 100, weight: 0.5 }),
    compliance: 1,
    status: 'on_track',
  },
  {
    row: { activo: true, gap_id: 'g2', in_global_portfolio: true, weight: 0.5 },
    metric: m({ calc_type: 'maximize', baseline: 0, current: null, target_m18: 100, weight: 0.5 }),
    compliance: null,
    status: null,
  },
])
assert.equal(derived.coverage.totalKpiCount, 2)
assert.equal(derived.coverage.eligibleKpiCount, 1)
assert.equal(derived.coverage.totalWeight, 1)
assert.equal(derived.coverage.eligibleWeight, 0.5)
assert.equal(derived.coverage.missingWeight, 0.5)

console.log('kpi-calculation-smoke: OK')

