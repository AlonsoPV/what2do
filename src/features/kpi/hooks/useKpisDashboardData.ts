import { useMemo } from 'react'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { CatalogKpiMeasurement, CatalogKpiO2cRow, Gap } from '../types/kpi.types'
import {
  computeComplianceTrendFromRecent,
  type KpiComplianceStatus,
  type KpiMetric,
  type TargetHorizon,
} from '../utils/kpiCalculations'
import { useCatalogKpiO2cPortfolioPipeline } from './useCatalogKpiO2cPortfolioPipeline'
import { useGaps } from './useGaps'

export type EnrichedKpi = {
  row: CatalogKpiO2cRow
  gap: Gap | null
  metric: KpiMetric
  compliance: number | null
  status: KpiComplianceStatus | null
  trendDelta: number | null
  /** Penúltima medición con cumplimiento válido (para tendencia visual). */
  prevCompliance: number | null
}

export type UseKpisDashboardDataResult = ReturnType<typeof useCatalogKpiO2cPortfolioPipeline> & {
  gapsLoading: boolean
  gapById: Map<string, Gap>
  userById: Map<string, string>
  enriched: EnrichedKpi[]
}

/**
 * Orquestación de datos del tablero KPIs O2C: pipeline O2C, gaps, usuarios y filas enriquecidas con tendencia.
 * La página solo debe manejar estado de UI (filtros, orden) y render.
 */
export function useKpisDashboardData(
  targetHorizon: TargetHorizon
): UseKpisDashboardDataResult {
  const pipeline = useCatalogKpiO2cPortfolioPipeline({ activo: true, targetHorizon })
  const { data: gaps = [], isLoading: gapsLoading } = useGaps()
  const { data: users = [] } = useUsers({ activo: true })

  const { metricItems, recentById, targetHorizon: pipelineHorizon } = pipeline

  const gapById = useMemo(() => {
    const m = new Map<string, Gap>()
    for (const g of gaps) m.set(g.id, g)
    return m
  }, [gaps])

  const userById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.nombre)
    return m
  }, [users])

  /** Historial reciente como record para dependencias estables entre renders. */
  const recentHistoryRecord = useMemo((): Record<string, CatalogKpiMeasurement[] | undefined> => {
    const o: Record<string, CatalogKpiMeasurement[] | undefined> = {}
    for (const [id, rows] of recentById.entries()) {
      o[id] = rows
    }
    return o
  }, [recentById])

  const enriched = useMemo((): EnrichedKpi[] => {
    const out: EnrichedKpi[] = []

    for (const item of metricItems) {
      const { row, metric, compliance, status } = item

      const hist = recentHistoryRecord[row.id]
      const trend = computeComplianceTrendFromRecent(row, hist, {
        targetHorizon: pipelineHorizon,
      })
      const { trendDelta, prevCompliance } = trend

      const gap = row.gap_id ? gapById.get(row.gap_id) ?? null : null
      out.push({ row, gap, metric, compliance, status, trendDelta, prevCompliance })
    }
    return out
  }, [metricItems, recentHistoryRecord, gapById, pipelineHorizon])

  return {
    ...pipeline,
    gapsLoading,
    gapById,
    userById,
    enriched,
  }
}
