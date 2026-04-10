/**
 * Cálculos O2C para KPIs ponderados (`catalog_kpis` + mediciones).
 * No confundir con el semáforo legacy (`kpis` / `kpi_mediciones`).
 *
 * API principal:
 * - **Metas:** `resolveTarget` (horizonte M6/M12/M18 con fallback).
 * - **Modo:** `resolveEffectiveCalcType` (maximize | minimize | binary; legacy `direction`).
 * - **Fila → métrica:** `computeCatalogKpiMetricItem` (comparte lógica con `useCatalogKpiMetricsList`).
 * - **Cumplimiento:** `calculateCompliance` / `calculateComplianceForCatalogRow`.
 * - **Semáforo:** `getKpiStatus` / `getKpiStatusForMetric` (umbrales por KPI o defaults 0.85 / 0.65).
 * - **Agregación:** `calculateWeightedScore`, `sumWeightedComplianceParts`, `calculateGlobalScore`, `deriveGlobalPortfolioFromMetricItems`.
 * - **Umbrales:** `normalizeKpiComplianceBandThresholds` (verde ≥ amarillo).
 * - **Por gap:** `getGapWeights`, `getGapWeight` (suma de pesos sin validar a 1).
 */

import type { CatalogKpiMeasurement, CatalogKpiO2cRow } from '../types/kpi.types'

export type CatalogKpiDirection = 'maximize' | 'minimize'

/** Alineado a `catalog_kpi_calc_type` en BD. */
export type CatalogKpiCalcType = 'minimize' | 'maximize' | 'binary'

/** Semáforo de cumplimiento normalizado (0–1). */
export type KpiComplianceStatus = 'on_track' | 'at_risk' | 'off_track'

/** Horizonte de meta efectiva (fallback hacia M18 si falta meta intermedia). */
export type TargetHorizon = 'm6' | 'm12' | 'm18'

/**
 * Política por defecto del producto: M18 hasta calendario O2C explícito.
 * Usar el mismo valor en `useO2cGlobalScore`, `KpisDashboardPage` y cualquier score global.
 */
export const DEFAULT_O2C_TARGET_HORIZON: TargetHorizon = 'm18'

/**
 * Vista de métrica alineada a columnas O2C + valor actual resuelto
 * (última medición preferida sobre `current_value` en el caller).
 */
export type KpiMetric = {
  id: string
  baseline: number | null
  target_m6: number | null
  target_m12: number | null
  target_m18: number | null
  /** Preferido; si es null se infiere desde `direction` (solo maximize/minimize). */
  calc_type: CatalogKpiCalcType | null
  direction: CatalogKpiDirection | null
  /** Peso 0–1 (gap o portafolio global); null si aún no aplica. */
  weight: number | null
  /**
   * Valor actual para el cálculo; `null` = sin datos (no asumir 100%).
   */
  current: number | null
  /** Cumplimiento ≥ este valor (0–1) → on_track; null = usar default global. */
  threshold_green: number | null
  /** Cumplimiento ≥ este valor (0–1) → at_risk si < green; null = usar default global. */
  threshold_yellow: number | null
}

/** Umbral superior por defecto: cumplimiento ≥ este valor → on_track */
export const KPI_COMPLIANCE_ON_TRACK_MIN = 0.85
/** Umbral medio por defecto: cumplimiento ≥ este valor (y < on_track) → at_risk */
export const KPI_COMPLIANCE_AT_RISK_MIN = 0.65

const EPS = 1e-9

export type KpiStatusThresholds = {
  /** Mínimo de cumplimiento (0–1) para verde. */
  greenMin?: number | null
  /** Mínimo de cumplimiento (0–1) para amarillo (debe ser ≤ green). */
  yellowMin?: number | null
  /** @deprecated Usar `greenMin`. */
  onTrackMin?: number
  /** @deprecated Usar `yellowMin`. */
  atRiskMin?: number
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b))
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Asegura banda verde ≥ banda amarilla (0–1). Si los valores vienen invertidos, se intercambian.
 * Usado por `resolveEffectiveStatusThresholds` y `getKpiStatus`.
 */
export function normalizeKpiComplianceBandThresholds(
  greenMin: number,
  yellowMin: number
): { greenMin: number; yellowMin: number } {
  const g = clamp01(greenMin)
  const y = clamp01(yellowMin)
  if (g < y) {
    return { greenMin: y, yellowMin: g }
  }
  return { greenMin: g, yellowMin: y }
}

/**
 * Meta numérica según horizonte: M6/M12 caen a M18 si la meta intermedia es null.
 * Política por defecto del producto: M18 hasta definir calendario O2C explícito.
 */
export function resolveTarget(
  kpi: KpiMetric,
  horizon: TargetHorizon = DEFAULT_O2C_TARGET_HORIZON
): number | null {
  switch (horizon) {
    case 'm6':
      if (isFiniteNumber(kpi.target_m6)) return kpi.target_m6
      if (isFiniteNumber(kpi.target_m12)) return kpi.target_m12
      return isFiniteNumber(kpi.target_m18) ? kpi.target_m18 : null
    case 'm12':
      if (isFiniteNumber(kpi.target_m12)) return kpi.target_m12
      return isFiniteNumber(kpi.target_m18) ? kpi.target_m18 : null
    case 'm18':
    default:
      return isFiniteNumber(kpi.target_m18) ? kpi.target_m18 : null
  }
}

/**
 * Tipo de cálculo efectivo: `calc_type` en BD, o legacy `direction` → maximize/minimize.
 */
export function resolveEffectiveCalcType(kpi: KpiMetric): CatalogKpiCalcType | null {
  if (kpi.calc_type === 'binary' || kpi.calc_type === 'maximize' || kpi.calc_type === 'minimize') {
    return kpi.calc_type
  }
  if (kpi.direction === 'maximize') return 'maximize'
  if (kpi.direction === 'minimize') return 'minimize'
  return null
}

function complianceMaximizeMinimize(
  baseline: number,
  target: number,
  current: number,
  mode: 'maximize' | 'minimize'
): number | null {
  if (mode === 'maximize') {
    if (nearlyEqual(baseline, target)) {
      return current >= target ? 1 : 0
    }
    const denom = target - baseline
    if (nearlyEqual(denom, 0)) return current >= target ? 1 : 0
    if (denom < 0) return null
    const raw = (current - baseline) / denom
    return clamp01(raw)
  }

  if (nearlyEqual(baseline, target)) {
    return current <= target ? 1 : 0
  }
  const denom = baseline - target
  if (nearlyEqual(denom, 0)) return current <= target ? 1 : 0
  if (denom < 0) return null
  const raw = (baseline - current) / denom
  return clamp01(raw)
}

/**
 * Umbrales de semáforo a partir de un KPI (null en columnas → defaults globales).
 */
export function thresholdsFromKpiMetric(metric: KpiMetric): KpiStatusThresholds {
  return {
    greenMin: metric.threshold_green,
    yellowMin: metric.threshold_yellow,
  }
}

/**
 * Umbrales efectivos (0–1) para UI y `getKpiStatus`: columnas del KPI o defaults 0.85 / 0.65.
 * Si los datos vienen inconsistentes (umbral verde menor que el amarillo), se normaliza para que verde ≥ amarillo.
 */
export function resolveEffectiveStatusThresholds(metric: KpiMetric): {
  greenMin: number
  yellowMin: number
} {
  const rawG = isFiniteNumber(metric.threshold_green)
    ? metric.threshold_green
    : KPI_COMPLIANCE_ON_TRACK_MIN
  const rawY = isFiniteNumber(metric.threshold_yellow)
    ? metric.threshold_yellow
    : KPI_COMPLIANCE_AT_RISK_MIN
  return normalizeKpiComplianceBandThresholds(rawG, rawY)
}

/**
 * Cumplimiento en [0, 1].
 * - maximize / minimize: progreso desde baseline hacia meta efectiva (`resolveTarget`).
 * - binary: 1 si valor actual ≈ meta efectiva, 0 si no.
 *
 * Configuración inválida (p. ej. maximize con target < baseline sin igualdad) → `null`.
 */
export function calculateCompliance(
  kpi: KpiMetric,
  opts?: { targetHorizon?: TargetHorizon }
): number | null {
  const horizon = opts?.targetHorizon ?? DEFAULT_O2C_TARGET_HORIZON
  const target = resolveTarget(kpi, horizon)
  const { baseline, current } = kpi

  if (!isFiniteNumber(current)) return null
  if (!isFiniteNumber(target)) return null

  const mode = resolveEffectiveCalcType(kpi)
  if (mode === null) return null

  if (mode === 'binary') {
    return nearlyEqual(current, target) ? 1 : 0
  }

  if (!isFiniteNumber(baseline)) return null

  return complianceMaximizeMinimize(baseline, target, current, mode)
}

/**
 * Mapea cumplimiento [0, 1] a semáforo usando umbrales por KPI o defaults (0.85 / 0.65).
 */
export function getKpiStatus(
  compliance: number | null,
  thresholds?: KpiStatusThresholds
): KpiComplianceStatus | null {
  if (compliance === null || !Number.isFinite(compliance)) return null

  const rawG =
    thresholds?.greenMin ??
    thresholds?.onTrackMin ??
    KPI_COMPLIANCE_ON_TRACK_MIN
  const rawY =
    thresholds?.yellowMin ??
    thresholds?.atRiskMin ??
    KPI_COMPLIANCE_AT_RISK_MIN

  const onMin = isFiniteNumber(rawG) ? rawG : KPI_COMPLIANCE_ON_TRACK_MIN
  const arMin = isFiniteNumber(rawY) ? rawY : KPI_COMPLIANCE_AT_RISK_MIN
  const { greenMin, yellowMin } = normalizeKpiComplianceBandThresholds(onMin, arMin)

  if (compliance >= greenMin) return 'on_track'
  if (compliance >= yellowMin) return 'at_risk'
  return 'off_track'
}

/** Atajo: `getKpiStatus` con umbrales efectivos por KPI (defaults si columnas null). */
export function getKpiStatusForMetric(
  compliance: number | null,
  metric: KpiMetric
): KpiComplianceStatus | null {
  const { greenMin, yellowMin } = resolveEffectiveStatusThresholds(metric)
  return getKpiStatus(compliance, { greenMin, yellowMin })
}

/**
 * Contribución ponderada de un KPI: `weight × compliance` (null si falta dato).
 */
export function calculateWeightedScore(compliance: number | null, weight: number | null): number | null {
  if (compliance === null || !Number.isFinite(compliance)) return null
  if (!isFiniteNumber(weight) || weight <= 0) return null
  return weight * compliance
}

/**
 * Partes para score global: Σ(weight × compliance) y Σ(weight) solo sobre KPIs con
 * cumplimiento válido y peso finito > 0.
 */
export function sumWeightedComplianceParts(
  kpis: KpiMetric[],
  opts?: { targetHorizon?: TargetHorizon }
): { weightedSum: number; weightSum: number } {
  let weightedSum = 0
  let weightSum = 0

  for (const k of kpis) {
    const c = calculateCompliance(k, opts)
    if (c === null) continue
    const w = k.weight
    if (!isFiniteNumber(w) || w <= 0) continue
    weightedSum += w * c
    weightSum += w
  }

  return { weightedSum, weightSum }
}

/**
 * Score global (0–1): media ponderada Σ(weight_i × compliance_i) / Σ(weight_i).
 * Si no hay KPIs elegibles, devuelve `null`.
 */
export function calculateGlobalScore(
  kpis: KpiMetric[],
  opts?: { targetHorizon?: TargetHorizon }
): number | null {
  const { weightedSum, weightSum } = sumWeightedComplianceParts(kpis, opts)
  if (weightSum <= 0 || !Number.isFinite(weightedSum)) return null
  return weightedSum / weightSum
}

/**
 * Misma fórmula que `calculateGlobalScore` pero a partir de filas que ya exponen `metric`
 * (p. ej. `CatalogKpiMetricItem`).
 */
export function calculateGlobalScoreFromMetrics(
  items: Array<{ metric: KpiMetric }>,
  opts?: { targetHorizon?: TargetHorizon }
): number | null {
  return calculateGlobalScore(
    items.map((e) => e.metric),
    opts
  )
}

/** Fila mínima para filtrar KPIs del portafolio global ponderado. */
export type PortfolioFilterableKpiRow = {
  activo: boolean
  gap_id: string | null
  in_global_portfolio: boolean
}

export function isCatalogKpiInGlobalPortfolio(row: PortfolioFilterableKpiRow): boolean {
  return row.activo && row.gap_id != null && row.in_global_portfolio
}

/**
 * KPIs activos con gap y `in_global_portfolio` (misma regla en dashboard ejecutivo y `/dashboard/kpis`).
 */
export function filterGlobalPortfolioMetricItems<T extends { row: PortfolioFilterableKpiRow }>(
  items: T[]
): T[] {
  return items.filter((e) => isCatalogKpiInGlobalPortfolio(e.row))
}

/** Conteo por semáforo para el widget de score global (estructura alineada a `GlobalScoreBreakdown`). */
export type PortfolioComplianceBreakdown = {
  on_track: number
  at_risk: number
  off_track: number
  sin_datos: number
}

export function buildGlobalPortfolioBreakdown(
  items: Array<{ compliance: number | null; status: KpiComplianceStatus | null }>
): PortfolioComplianceBreakdown {
  const b: PortfolioComplianceBreakdown = { on_track: 0, at_risk: 0, off_track: 0, sin_datos: 0 }
  for (const e of items) {
    if (e.compliance === null || e.status === null) {
      b.sin_datos += 1
      continue
    }
    if (e.status === 'on_track') b.on_track += 1
    else if (e.status === 'at_risk') b.at_risk += 1
    else b.off_track += 1
  }
  return b
}

/** Fila mínima para sumar pesos del portafolio global (KPIs filtrados con `in_global_portfolio`). */
export type PortfolioWeightedRow = {
  row: { weight: number | null }
}

/** Debe reflejar la misma tolerancia usada en validaciones de catálogo y BD. */
export const GLOBAL_PORTFOLIO_WEIGHT_TOLERANCE = 1e-4

/**
 * Σ `weight` en filas ya filtradas al portafolio global.
 */
export function sumPortfolioWeights<T extends PortfolioWeightedRow>(items: T[]): number {
  let s = 0
  for (const e of items) {
    const w = e.row.weight
    if (typeof w === 'number' && Number.isFinite(w)) s += w
  }
  return s
}

/**
 * Mensaje si la suma de pesos del portafolio global no ≈ 1 (solo si hay KPIs en el conjunto).
 */
export function globalPortfolioWeightWarning(weightSum: number, itemCount: number): string | null {
  if (itemCount <= 0) return null
  if (Math.abs(weightSum - 1) > GLOBAL_PORTFOLIO_WEIGHT_TOLERANCE) {
    return `La suma de pesos del portafolio global es ${weightSum.toFixed(4)} (se espera 1).`
  }
  return null
}

/**
 * Entrada mínima para derivar score global, desglose y diagnóstico de pesos desde `useCatalogKpiMetricsList`.
 */
export type CatalogKpiMetricItemForPortfolio = {
  row: PortfolioFilterableKpiRow & { weight: number | null }
  metric: KpiMetric
  compliance: number | null
  status: KpiComplianceStatus | null
}

export type GlobalPortfolioDerived = {
  portfolioMetricItems: CatalogKpiMetricItemForPortfolio[]
  globalScore: number | null
  portfolioBreakdown: PortfolioComplianceBreakdown
  weightSum: number
  weightWarning: string | null
  /** Cobertura de datos efectiva usada para el score global. */
  coverage: {
    totalKpiCount: number
    eligibleKpiCount: number
    totalWeight: number
    eligibleWeight: number
    missingWeight: number
  }
}

/**
 * Cobertura del score global:
 * - totalWeight: suma de pesos del portafolio.
 * - eligibleWeight: pesos que sí entraron al score (cumplimiento no nulo y peso > 0).
 * - missingWeight: pesos sin datos elegibles.
 */
export function deriveGlobalCoverage(
  items: CatalogKpiMetricItemForPortfolio[],
  opts?: { targetHorizon?: TargetHorizon }
): GlobalPortfolioDerived['coverage'] {
  const totalWeight = sumPortfolioWeights(items)
  const { weightSum: eligibleWeight } = sumWeightedComplianceParts(
    items.map((e) => e.metric),
    opts
  )
  let eligibleKpiCount = 0
  for (const e of items) {
    const c = calculateCompliance(e.metric, opts)
    const w = e.metric.weight
    if (c === null) continue
    if (!isFiniteNumber(w) || w <= 0) continue
    eligibleKpiCount += 1
  }
  return {
    totalKpiCount: items.length,
    eligibleKpiCount,
    totalWeight,
    eligibleWeight,
    missingWeight: Math.max(0, totalWeight - eligibleWeight),
  }
}

/**
 * Pipeline único: filtrar portafolio global, score ponderado, desglose semáforo y aviso de suma de pesos.
 * Usar desde `useCatalogKpiGlobalPortfolioDerived` y cualquier vista que replique el dashboard ejecutivo.
 */
export function deriveGlobalPortfolioFromMetricItems(
  metricItems: CatalogKpiMetricItemForPortfolio[],
  opts?: { targetHorizon?: TargetHorizon }
): GlobalPortfolioDerived {
  const portfolioMetricItems = filterGlobalPortfolioMetricItems(metricItems)
  const globalScore = calculateGlobalScoreFromMetrics(portfolioMetricItems, opts)
  const portfolioBreakdown = buildGlobalPortfolioBreakdown(portfolioMetricItems)
  const weightSum = sumPortfolioWeights(portfolioMetricItems)
  const weightWarning = globalPortfolioWeightWarning(weightSum, portfolioMetricItems.length)
  const coverage = deriveGlobalCoverage(portfolioMetricItems, opts)
  return {
    portfolioMetricItems,
    globalScore,
    portfolioBreakdown,
    weightSum,
    weightWarning,
    coverage,
  }
}

export type GapWeightRow = {
  gap_id: string | null
  weight: number | null
  activo?: boolean
}

/**
 * Suma de pesos por `gap_id` (solo filas con gap y peso finito; opcionalmente `activo === true`).
 */
export function getGapWeights(
  rows: GapWeightRow[],
  opts?: { onlyActivo?: boolean }
): Map<string, number> {
  const onlyActivo = opts?.onlyActivo ?? false
  const m = new Map<string, number>()
  for (const r of rows) {
    if (onlyActivo && r.activo === false) continue
    const gid = r.gap_id
    if (!gid) continue
    const w = r.weight
    if (!isFiniteNumber(w)) continue
    m.set(gid, (m.get(gid) ?? 0) + w)
  }
  return m
}

/**
 * Suma de pesos para un gap (alias de conveniencia sobre `getGapWeights`).
 * Plan: `getGapWeight` = SUM(weight) por gap sin validar que sume 1.
 */
export function getGapWeight(
  gapId: string,
  rows: GapWeightRow[],
  opts?: { onlyActivo?: boolean }
): number {
  return getGapWeights(rows, opts).get(gapId) ?? 0
}

/**
 * Valor actual para cálculos: última medición → `current_value` → **baseline** como punto de partida.
 * Sin medición ni valor en catálogo, usar baseline permite cumplimiento y score global O2C sin datos operativos aún.
 */
export function resolveCatalogKpiCurrent(
  row: CatalogKpiO2cRow,
  latestValor: number | undefined
): number | null {
  const explicit = latestValor ?? row.current_value
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return explicit
  const b = row.baseline
  if (typeof b === 'number' && Number.isFinite(b)) return b
  return null
}

/**
 * Construye `KpiMetric` desde fila de catálogo + valor actual resuelto.
 */
export function buildKpiMetricFromCatalogRow(row: CatalogKpiO2cRow, current: number | null): KpiMetric {
  return {
    id: row.id,
    baseline: row.baseline ?? null,
    target_m6: row.target_m6 ?? null,
    target_m12: row.target_m12 ?? null,
    target_m18: row.target_m18 ?? null,
    calc_type: row.calc_type ?? null,
    direction: row.direction ?? null,
    weight: row.weight ?? null,
    current,
    threshold_green: row.threshold_green ?? null,
    threshold_yellow: row.threshold_yellow ?? null,
  }
}

/**
 * Resultado de aplicar mediciones + horizonte a una fila de catálogo (única fuente para hooks).
 */
export type CatalogKpiMetricComputed = {
  row: CatalogKpiO2cRow
  metric: KpiMetric
  compliance: number | null
  status: KpiComplianceStatus | null
}

/**
 * Una fila de catálogo → métrica, cumplimiento y semáforo (misma lógica que `useCatalogKpiMetricsList`).
 */
export function computeCatalogKpiMetricItem(
  row: CatalogKpiO2cRow,
  latest: CatalogKpiMeasurement | undefined,
  opts?: { targetHorizon?: TargetHorizon }
): CatalogKpiMetricComputed {
  const horizon = opts?.targetHorizon ?? DEFAULT_O2C_TARGET_HORIZON
  const current = resolveCatalogKpiCurrent(row, latest?.valor)
  const metric = buildKpiMetricFromCatalogRow(row, current)
  const compliance = calculateCompliance(metric, { targetHorizon: horizon })
  const status = getKpiStatusForMetric(compliance, metric)
  return { row, metric, compliance, status }
}

/**
 * Cumplimiento a partir de una fila de catálogo y un valor medido (p. ej. tendencia vs medición anterior).
 */
export function calculateComplianceForCatalogRow(
  row: CatalogKpiO2cRow,
  measuredValue: number | null | undefined,
  opts?: { targetHorizon?: TargetHorizon }
): number | null {
  const current =
    measuredValue !== undefined && measuredValue !== null && Number.isFinite(measuredValue)
      ? measuredValue
      : null
  return calculateCompliance(buildKpiMetricFromCatalogRow(row, current), opts)
}

/**
 * Tendencia entre las dos mediciones más recientes (más nueva primero), mismo horizonte de meta.
 */
export function computeComplianceTrendFromRecent(
  row: CatalogKpiO2cRow,
  recentNewestFirst: Array<{ valor: number }> | undefined | null,
  opts?: { targetHorizon?: TargetHorizon }
): { trendDelta: number | null; prevCompliance: number | null } {
  if (!recentNewestFirst || recentNewestFirst.length < 2) {
    return { trendDelta: null, prevCompliance: null }
  }
  const [latest, prev] = recentNewestFirst
  const cLatest = calculateComplianceForCatalogRow(row, latest.valor, opts)
  const cPrev = calculateComplianceForCatalogRow(row, prev.valor, opts)
  if (cLatest === null || cPrev === null) {
    return { trendDelta: null, prevCompliance: null }
  }
  return { trendDelta: cLatest - cPrev, prevCompliance: cPrev }
}
