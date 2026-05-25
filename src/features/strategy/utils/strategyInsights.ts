/**
 * Derivaciones consultivas puras para el mapa estratégico — sin hooks ni side-effects.
 */

import type { GapKpiLink } from '@/features/kpi/hooks/useGapKpiLinks'

export type FceComplianceHealth = 'on_track' | 'at_risk' | 'off_track' | 'sin_datos'

export type StrategyComplianceInput = Readonly<{ compliance: number | null }>

/** Salud agregada del FCE a partir del promedio de cumplimientos KPI (solo filas con dato). */
export function getFceHealthFromCompliance(
  kpiItems: StrategyComplianceInput[]
): { health: FceComplianceHealth; avgCompliance: number | null } {
  if (kpiItems.length === 0) return { health: 'sin_datos', avgCompliance: null }
  const withData = kpiItems.filter((k) => k.compliance != null && Number.isFinite(k.compliance))
  if (withData.length === 0) return { health: 'sin_datos', avgCompliance: null }
  const avg = withData.reduce((s, k) => s + (k.compliance as number), 0) / withData.length
  if (avg >= 0.85) return { health: 'on_track', avgCompliance: avg }
  if (avg >= 0.65) return { health: 'at_risk', avgCompliance: avg }
  return { health: 'off_track', avgCompliance: avg }
}

export function yearsRemainingToBhag(bhagAnio: number, nowYear = new Date().getFullYear()): number {
  return Math.max(0, bhagAnio - nowYear)
}

export function generateSystemReading(
  scoreGlobal: number | null,
  kpisOnTrack: number,
  totalKpis: number,
  gapsCerrados: number,
  totalGaps: number,
  accionesCompletadas: number,
  totalAcciones: number
): string {
  if (scoreGlobal == null || !Number.isFinite(scoreGlobal))
    return 'Sin datos suficientes para interpretar el sistema en conjunto.'
  const score = Math.round(scoreGlobal * 100)
  const kpiPct = totalKpis > 0 ? Math.round((kpisOnTrack / totalKpis) * 100) : 0
  const gapPct = totalGaps > 0 ? Math.round((gapsCerrados / totalGaps) * 100) : 0
  const actionSignal = totalAcciones > 0 ? accionesCompletadas / totalAcciones : 0
  void actionSignal

  if (score < 30) {
    return `El sistema está en etapa inicial: ${score}% de score global con ${kpiPct}% de KPIs en meta en el portafolio. La prioridad es cerrar acciones que desbloqueen los gaps más críticos ya anclados a FCE.`
  }
  if (score < 65) {
    return `El sistema está en construcción: ${gapPct}% de gaps marcados cerrados por avance. Conviene enfocarse en los FCE con mayor densidad de brechas activas y en completar mediciones de KPI ligados al BHAG.`
  }
  return `El sistema avanza: ${score}% de score global con ${kpisOnTrack} de ${totalKpis} KPIs en meta operativa en el semáforo. Mantenga cadencia de acciones verificadas y la calidad del dato registrado para sostener el pulso positivo.`
}

/** Líneas de `strategic_north.valores`: narrativa vs pilares marcados "(1)...". */
export type StrategicContextLine =
  | { kind: 'narrative'; text: string }
  | { kind: 'pillar'; index: number; text: string }

const DESGLOSE_BHAG_PREFIX = /^Desglose\s+del\s+BHA?G\s*:\s*/i

/**
 * Interpreta texto multilinea (fallback o BD): rompe líneas vacías,
 * permite "Desglose del BHAG: (1) …" en una sola línea y líneas `(2) texto`.
 */
export function parseStrategicContextValor(raw: string): StrategicContextLine[] {
  const t0 = raw.trim()
  if (!t0) return []

  const out: StrategicContextLine[] = []
  for (const line of t0.split(/\n+/).map((s) => s.trim())) {
    if (!line) continue
    let s = line
    const pref = s.match(DESGLOSE_BHAG_PREFIX)
    if (pref) s = s.slice(pref[0].length).trim()
    const m = s.match(/^\((\d+)\)\s*(.+)$/s)
    if (m) {
      const idx = Number.parseInt(m[1], 10)
      if (Number.isFinite(idx) && m[2]) out.push({ kind: 'pillar', index: idx, text: m[2].trim() })
      continue
    }
    out.push({ kind: 'narrative', text: line })
  }

  return out
}

/** Subcadenas para asociar gaps del catálogo a cada proceso O2C (índice 0..7). */
export const PROCESO_GAP_NAME_HINTS: readonly (readonly string[])[] = [
  ['GAP-MD-09', 'kick-off', 'aceptar cliente', 'credito cliente'],
  ['GAP-MD-01', 'reasignaci', 'planear', 'planeaci'],
  ['GAP-MD-09', 'flota', 'operador', 'validar'],
  ['GAP-MD-03', 'monitoreo', 'manual', 'viaje'],
  ['GAP-MD-04', 'GAP-MD-05', 'pod', 'evidenci', 'gráficas', 'temperatura'],
  ['GAP-MD-02', 'GAP-MD-07', 'carta port', 'factur', 'entrega'],
  ['GAP-MD-06', 'GAP-MD-08', 'viáticos', 'cobran', 'cts', 'margen'],
  ['GAP-MD-10', 'dashboard', 'gobiern', 'datos', 'bi'],
] as const

export function gapLinksMatchingProceso(links: readonly GapKpiLink[], procesoIndex: number): GapKpiLink[] {
  const hints = PROCESO_GAP_NAME_HINTS[procesoIndex]
  if (!hints?.length) return []
  const n = (s: string) => s.toLowerCase()
  return links.filter((l) => hints.some((h) => n(l.gapNombre).includes(h.toLowerCase())))
}

export type ProcessoOperationalTone = 'ok' | 'warn' | 'crit'

export function processoOperationalTone(activeGaps: readonly GapKpiLink[]): ProcessoOperationalTone {
  const openLike = activeGaps.filter((g) => g.estado !== 'cerrado')
  if (openLike.length === 0) return 'ok'
  const veryWeak = openLike.some((g) => g.avancePct < 0.3)
  if (veryWeak) return 'crit'
  return 'warn'
}

export function fceLayerCompletenessPct(kpisPerFce: readonly (readonly StrategyComplianceInput[])[]): number {
  if (kpisPerFce.length === 0) return 0
  let sum = 0
  for (const kpis of kpisPerFce) {
    const { health } = getFceHealthFromCompliance([...kpis])
    switch (health) {
      case 'on_track':
        sum += 100
        break
      case 'at_risk':
        sum += 55
        break
      case 'off_track':
        sum += 22
        break
      default:
        sum += 35
        break
    }
  }
  return Math.round(sum / kpisPerFce.length)
}

export function processesLayerCompletenessPct(procesoTones: readonly ProcessoOperationalTone[]): number {
  if (procesoTones.length === 0) return 0
  const map = { ok: 100, warn: 55, crit: 20 } as const
  const s = procesoTones.reduce((acc, t) => acc + map[t], 0)
  return Math.round(s / procesoTones.length)
}
