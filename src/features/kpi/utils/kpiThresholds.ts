/**
 * Umbrales y normalización de bandas de cumplimiento (0–1).
 * Separado de `kpiCalculations.ts` para mantenibilidad; las funciones de dominio siguen reexportándose allí.
 */

/** Umbral superior por defecto: cumplimiento ≥ este valor → on_track */
export const KPI_COMPLIANCE_ON_TRACK_MIN = 0.85
/** Umbral medio por defecto: cumplimiento ≥ este valor (y < on_track) → at_risk */
export const KPI_COMPLIANCE_AT_RISK_MIN = 0.6

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Asegura banda verde ≥ banda amarilla (0–1). Si los valores vienen invertidos, se intercambian.
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
