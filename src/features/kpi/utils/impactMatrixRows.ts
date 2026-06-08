import type { AccionDiaria } from '@/types'
import { accionStoryPoints } from './gapProgress'
import { calcularImpactoAccion } from './impactCalculations'

export type ImpactRow = {
  accionId: string
  titulo: string
  gapId: string | null
  gapNombre: string | null
  storyPoints: number | null
  totalPuntosGap: number
  kpiNombre: string | null
  pesoKpi: number | null
  impactoPct: number | null
  estado: string | null
}

type GapLite = { id: string; nombre: string; total_story_points?: number | null }
type KpiLite = { nombre: string; weight: number | null }

/** Gap ids por acción: columna `gap_id` + tabla `accion_gaps`. */
export function buildAccionGapIdsMap(
  acciones: AccionDiaria[],
  junctionAccionIdsByGap: Map<string, Set<string>>
): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>()
  for (const a of acciones) {
    if (a.gap_id) {
      if (!m.has(a.id)) m.set(a.id, new Set())
      m.get(a.id)!.add(a.gap_id)
    }
  }
  for (const [gapId, accionIds] of junctionAccionIdsByGap) {
    for (const accionId of accionIds) {
      if (!m.has(accionId)) m.set(accionId, new Set())
      m.get(accionId)!.add(gapId)
    }
  }
  return m
}

/** Suma de story points por gap (todas las acciones vinculadas). */
export function buildTotalPtsByGap(
  acciones: AccionDiaria[],
  accionGapIds: Map<string, Set<string>>
): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of acciones) {
    const sp = accionStoryPoints(a)
    if (sp <= 0) continue
    const gapIds = accionGapIds.get(a.id)
    if (!gapIds?.size) continue
    for (const gid of gapIds) {
      m.set(gid, (m.get(gid) ?? 0) + sp)
    }
  }
  return m
}

function buildRowForGap(
  a: AccionDiaria,
  gapId: string,
  storyPoints: number,
  gap: GapLite,
  kpi: KpiLite,
  totalPtsByGap: Map<string, number>
): ImpactRow {
  const totalPtsAcciones = totalPtsByGap.get(gapId) ?? 0
  const totalPuntosGap = totalPtsAcciones > 0 ? totalPtsAcciones : (gap.total_story_points ?? 0)
  const impacto =
    kpi.weight != null ? calcularImpactoAccion(kpi.weight, storyPoints, totalPuntosGap) : null

  return {
    accionId: a.id,
    titulo: a.titulo_accion || '—',
    gapId,
    gapNombre: gap.nombre,
    storyPoints,
    totalPuntosGap,
    kpiNombre: kpi.nombre,
    pesoKpi: kpi.weight ?? null,
    impactoPct: impacto,
    estado: a.estado ?? null,
  }
}

export function buildImpactRowsFromAcciones(params: {
  acciones: AccionDiaria[]
  accionGapIds: Map<string, Set<string>>
  gapById: Map<string, GapLite>
  kpiByGapId: Map<string, KpiLite>
  totalPtsByGap: Map<string, number>
}): ImpactRow[] {
  const { acciones, accionGapIds, gapById, kpiByGapId, totalPtsByGap } = params
  const out: ImpactRow[] = []

  for (const a of acciones) {
    const storyPoints = accionStoryPoints(a)
    if (storyPoints <= 0) continue

    const gapIds = [...(accionGapIds.get(a.id) ?? [])]

    if (gapIds.length === 0) {
      out.push({
        accionId: a.id,
        titulo: a.titulo_accion || '—',
        gapId: null,
        gapNombre: null,
        storyPoints,
        totalPuntosGap: 0,
        kpiNombre: null,
        pesoKpi: null,
        impactoPct: null,
        estado: a.estado ?? null,
      })
      continue
    }

    let best: ImpactRow | null = null
    let fallback: ImpactRow | null = null

    for (const gapId of gapIds) {
      const gap = gapById.get(gapId)
      if (!gap) continue
      const kpi = kpiByGapId.get(gapId)
      if (!kpi) {
        if (!fallback) {
          fallback = {
            accionId: a.id,
            titulo: a.titulo_accion || '—',
            gapId,
            gapNombre: gap.nombre,
            storyPoints,
            totalPuntosGap: totalPtsByGap.get(gapId) ?? gap.total_story_points ?? 0,
            kpiNombre: null,
            pesoKpi: null,
            impactoPct: null,
            estado: a.estado ?? null,
          }
        }
        continue
      }

      const row = buildRowForGap(a, gapId, storyPoints, gap, kpi, totalPtsByGap)
      if (!best || (row.impactoPct ?? 0) > (best.impactoPct ?? 0)) {
        best = row
      }
    }

    const row = best ?? fallback
    if (row) out.push(row)
  }

  return out.sort(compareImpactRows)
}

export function compareImpactRows(a: ImpactRow | null | undefined, b: ImpactRow | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  const ai = a.impactoPct ?? -1
  const bi = b.impactoPct ?? -1
  if (bi !== ai) return bi - ai
  return (b.storyPoints ?? 0) - (a.storyPoints ?? 0)
}
