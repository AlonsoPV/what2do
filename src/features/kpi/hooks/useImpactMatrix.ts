import { useMemo } from 'react'
import { useAcciones } from '@/features/operations/hooks'
import { useCatalogKpiO2cMetricItems } from './useCatalogKpiO2cMetricItems'
import { useGapAccionesForGapIds } from './useGapAccionesForGapIds'
import { useGaps } from './useGaps'
import { DEFAULT_O2C_TARGET_HORIZON } from '../utils/kpiCalculations'
import {
  buildAccionGapIdsMap,
  buildImpactRowsFromAcciones,
  buildTotalPtsByGap,
  type ImpactRow,
} from '../utils/impactMatrixRows'

export type { ImpactRow } from '../utils/impactMatrixRows'

export type GapImpactSummaryRow = {
  gapId: string
  gapNombre: string
  totalPts: number
  impactoTotal: number
  accionCount: number
}

export type UseImpactMatrixOptions = {
  /** false para roles sin acceso (p. ej. Operativo). */
  enabled?: boolean
}

export function useImpactMatrix(options: UseImpactMatrixOptions = {}) {
  const enabled = options.enabled ?? true

  const { data: gaps = [], isLoading: gapsLoading } = useGaps({ enabled })
  const gapIds = useMemo(() => (enabled ? gaps.map((g) => g.id) : []), [enabled, gaps])
  const { data: gapAccionesData, isLoading: gapAccionesLoading } = useGapAccionesForGapIds(gapIds)
  const { data: acciones = [], isLoading: accionesLoading } = useAcciones({}, { enabled })
  const { metricItems, isLoading: kpisLoading } = useCatalogKpiO2cMetricItems({
    activo: true,
    targetHorizon: DEFAULT_O2C_TARGET_HORIZON,
    enabled,
  })

  const junctionAccionIdsByGap = useMemo(
    () => gapAccionesData?.junctionAccionIdsByGap ?? new Map<string, Set<string>>(),
    [gapAccionesData?.junctionAccionIdsByGap]
  )

  const gapById = useMemo(() => {
    return new Map(gaps.map((g) => [g.id, g] as const))
  }, [gaps])

  const kpiByGapId = useMemo(() => {
    const m = new Map<string, { nombre: string; weight: number | null }>()
    for (const item of metricItems) {
      const gid = item.row.gap_id
      if (gid && !m.has(gid)) {
        m.set(gid, { nombre: item.row.nombre, weight: item.row.weight })
      }
    }
    return m
  }, [metricItems])

  const accionGapIds = useMemo(
    () => buildAccionGapIdsMap(acciones, junctionAccionIdsByGap),
    [acciones, junctionAccionIdsByGap]
  )

  const totalPtsByGap = useMemo(
    () => buildTotalPtsByGap(acciones, accionGapIds),
    [acciones, accionGapIds]
  )

  const rows: ImpactRow[] = useMemo(() => {
    if (!enabled) return []
    return buildImpactRowsFromAcciones({
      acciones,
      accionGapIds,
      gapById,
      kpiByGapId,
      totalPtsByGap,
    })
  }, [enabled, acciones, accionGapIds, gapById, kpiByGapId, totalPtsByGap])

  const gapSummary = useMemo((): GapImpactSummaryRow[] => {
    const m = new Map<string, GapImpactSummaryRow>()
    for (const r of rows) {
      if (!r.gapId) continue
      const prev = m.get(r.gapId) ?? {
        gapId: r.gapId,
        gapNombre: r.gapNombre ?? r.gapId,
        totalPts: r.totalPuntosGap,
        impactoTotal: 0,
        accionCount: 0,
      }
      m.set(r.gapId, {
        ...prev,
        totalPts: r.totalPuntosGap,
        impactoTotal: prev.impactoTotal + (r.impactoPct ?? 0),
        accionCount: prev.accionCount + 1,
      })
    }
    return [...m.values()].sort((a, b) => b.impactoTotal - a.impactoTotal)
  }, [rows])

  const top10 = useMemo(() => rows.slice(0, 10), [rows])

  const impactoTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (r.impactoPct ?? 0), 0),
    [rows]
  )

  return {
    rows,
    gapSummary,
    top10,
    impactoTotal,
    isLoading: enabled && (gapsLoading || accionesLoading || kpisLoading || gapAccionesLoading),
  }
}
