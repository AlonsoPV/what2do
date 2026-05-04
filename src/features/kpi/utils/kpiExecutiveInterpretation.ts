import type { CatalogKpiCalcType, KpiComplianceStatus } from './kpiCalculations'

function fmtNum(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(digits)
}

/**
 * Una sola frase para la cara ejecutiva de la tarjeta (sin jerga de umbrales).
 */
export function buildKpiExecutiveInterpretation({
  noData,
  status,
  calcMode,
  currentValue,
  targetValue,
  compliancePct,
  unit,
  literalMetaCumplida,
}: {
  noData: boolean
  status: KpiComplianceStatus | null
  calcMode: CatalogKpiCalcType | null
  currentValue: number | null
  targetValue: number | null
  compliancePct: number | null
  unit: string | null
  literalMetaCumplida: boolean | null
}): string {
  const u = unit ? ` ${unit}` : ''

  if (noData) {
    return 'Registra una medición para saber si vas bien o mal frente a la meta.'
  }

  const cur = currentValue
  const tgt = targetValue

  if (calcMode === 'binary') {
    if (literalMetaCumplida === true) return 'Cumples el valor exigido por la meta.'
    if (literalMetaCumplida === false) {
      return cur != null && tgt != null
        ? `Tu medición (${fmtNum(cur)}${u}) no coincide con la meta (${fmtNum(tgt)}${u}).`
        : 'Aún no alcanzas la meta binaria configurada.'
    }
  }

  if (calcMode === 'minimize' && cur != null && tgt != null) {
    if (cur <= tgt) {
      if (status === 'on_track') return `En valor vas bien (${fmtNum(cur)}${u} frente a meta ${fmtNum(tgt)}${u}).`
      return `En valor cumples el objetivo (${fmtNum(cur)}${u} ≤ ${fmtNum(tgt)}${u}), pero el avance desde la línea base aún no entra en verde.`
    }
    const absTgt = Math.abs(tgt)
    if (absTgt < 1e-9) {
      return `Tu valor (${fmtNum(cur)}${u}) está por encima de la meta (${fmtNum(tgt)}${u}). Hay que reducir el indicador.`
    }
    const pct = ((cur - tgt) / absTgt) * 100
    return `Estás ~${pct.toFixed(0)}% por encima de la meta (${fmtNum(tgt)}${u}).`
  }

  if (calcMode === 'maximize' && cur != null && tgt != null) {
    if (cur >= tgt) {
      return `En o por encima de la meta (${fmtNum(cur)}${u} ≥ ${fmtNum(tgt)}${u}).`
    }
    const absTgt = Math.abs(tgt)
    if (absTgt < 1e-9) {
      return `Por debajo del objetivo (${fmtNum(tgt)}${u}). Sube el indicador en operación.`
    }
    const pct = ((tgt - cur) / absTgt) * 100
    return `Estás ~${pct.toFixed(0)}% por debajo de la meta (${fmtNum(tgt)}${u}).`
  }

  const adv = compliancePct != null ? Math.round(compliancePct * 100) : null
  if (status === 'on_track') {
    return adv != null ? `Avance ${adv}%: dentro del margen esperado.` : 'Dentro del margen esperado.'
  }
  if (status === 'at_risk') {
    return adv != null
      ? `Avance ${adv}%: en riesgo; conviene actuar antes de caer en crítico.`
      : 'En zona de riesgo.'
  }
  if (status === 'off_track') {
    return adv != null
      ? `Avance ${adv}%: fuera de meta; prioriza un plan de corrección.`
      : 'Fuera de meta; requiere atención.'
  }
  return 'Revisa la meta y las mediciones recientes.'
}
