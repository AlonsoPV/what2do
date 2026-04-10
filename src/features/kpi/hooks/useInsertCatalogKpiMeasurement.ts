import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import {
  insertCatalogKpiMeasurement,
  listLatestMeasurementsForCatalogKpiIds,
  type InsertCatalogKpiMeasurementInput,
} from '../services/catalogKpiMeasurements.service'
import { invalidateAfterCatalogKpiMeasurement } from '../kpiQueryKeys'
import { listCatalogKpisO2c } from '../services/catalogKpisO2c.service'
import { insertGlobalScoreSnapshot } from '../services/globalScoreSnapshots.service'
import { computeCatalogKpiMetricItem, deriveGlobalPortfolioFromMetricItems } from '../utils/kpiCalculations'

export type InsertCatalogKpiMeasurementVars = InsertCatalogKpiMeasurementInput & {
  gapId?: string | null
}

/**
 * Registra medición, sincroniza `current_value` en catálogo e invalida queries KPI.
 */
export function useInsertCatalogKpiMeasurement() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ gapId: _gapId, measured_by, ...rest }: InsertCatalogKpiMeasurementVars) => {
      return insertCatalogKpiMeasurement({
        ...rest,
        measured_by: measured_by ?? profile?.id ?? null,
      })
    },
    onSuccess: async (_data, vars) => {
      try {
        const rows = await listCatalogKpisO2c({ activo: true })
        const ids = rows.map((r) => r.id)
        const latestById = await listLatestMeasurementsForCatalogKpiIds(ids)
        const metricItems = rows.map((row) => computeCatalogKpiMetricItem(row, latestById.get(row.id)))
        const derived = deriveGlobalPortfolioFromMetricItems(metricItems)
        if (derived.globalScore != null && Number.isFinite(derived.globalScore)) {
          await insertGlobalScoreSnapshot({
            score: derived.globalScore,
            metadata: {
              source: 'measurement_insert',
              catalog_kpi_id: vars.catalog_kpi_id,
              portfolio_kpis: derived.coverage.totalKpiCount,
              eligible_kpis: derived.coverage.eligibleKpiCount,
              eligible_weight: derived.coverage.eligibleWeight,
              total_weight: derived.coverage.totalWeight,
            },
          })
        }
      } catch {
        // No bloquear el flujo principal si snapshot falla por permisos/RLS u otro error.
      }
      invalidateAfterCatalogKpiMeasurement(qc, {
        catalogKpiId: vars.catalog_kpi_id,
        gapId: vars.gapId ?? undefined,
      })
    },
  })
}
