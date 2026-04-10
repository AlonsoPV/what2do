/**
 * Dashboard Ejecutivo — rediseño tipo SaaS. Header, KPIs, filtros, control de acciones, semáforo.
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAcciones,
  useCommentCounts,
  useChecklistProgressByAccionIds,
  AccionFormDialog,
  KanbanToolbar,
  metricasFromAcciones,
} from '@/features/operations'
import {
  CatalogKpiSemaforoGrid,
  GlobalScoreHistoryChart,
  GlobalScoreWidget,
  useO2cGlobalScore,
} from '@/features/kpi'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { AccionDiaria } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'
import {
  dropdownOptionsByCatalogKeyQueryKey,
  fetchDropdownOptionsByCatalogKey,
} from '@/features/catalogs/hooks/useDropdownOptions'
import { DashboardHeader } from './components/DashboardHeader'
import { DashboardKpiCards } from './components/DashboardKpiCards'
import { DashboardActionsSection } from './components/DashboardActionsSection'
import { Activity, LineChart } from 'lucide-react'
import { todayCDMX } from '@/lib/dateUtils'

const DEFAULT_FILTER: AccionesFilter = {}

export function DashboardPage() {
  const qc = useQueryClient()
  const today = todayCDMX()
  const prefetchEvidenceCatalog = useCallback(async () => {
    await qc.prefetchQuery({
      queryKey: dropdownOptionsByCatalogKeyQueryKey('evidencia_esperada'),
      queryFn: () => fetchDropdownOptionsByCatalogKey('evidencia_esperada'),
    })
  }, [qc])

  useEffect(() => {
    void prefetchEvidenceCatalog()
  }, [prefetchEvidenceCatalog])

  const [filter, setFilter] = useState<AccionesFilter>(() => ({
    ...DEFAULT_FILTER,
    fecha_creacion: today,
  }))
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)

  const { data: acciones = [], isLoading } = useAcciones(filter)
  const accionIds = useMemo(() => acciones.map((a) => a.id), [acciones])
  const { data: commentCounts = {} } = useCommentCounts(accionIds)
  const { data: checklistProgressByAccionId = {} } = useChecklistProgressByAccionIds(accionIds)
  const { data: users = [] } = useUsers({ activo: true })

  const metricas = useMemo(() => metricasFromAcciones(acciones), [acciones])

  const {
    globalScore: o2cGlobalScore,
    portfolioBreakdown: o2cBreakdown,
    coverage: o2cCoverage,
    isLoading: o2cScoreLoading,
    metricItems: o2cMetricItems,
  } = useO2cGlobalScore()

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => {
      map[u.id] = u.nombre
    })
    return map
  }, [users])

  const handleFilterChange = useCallback((next: AccionesFilter | Partial<AccionesFilter>) => {
    setFilter((prev) => ({ ...prev, ...next }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilter({ ...DEFAULT_FILTER, fecha_creacion: today })
  }, [today])

  const handleCreate = useCallback(() => {
    void prefetchEvidenceCatalog()
    setEditingAccion(null)
    setDialogOpen(true)
  }, [prefetchEvidenceCatalog])

  const handleSelectAccion = useCallback((accion: AccionDiaria) => {
    void prefetchEvidenceCatalog()
    setEditingAccion(accion)
    setDialogOpen(true)
  }, [prefetchEvidenceCatalog])

  const handleDialogSuccess = useCallback(() => {
    setEditingAccion(null)
  }, [])

  return (
    <div id="dashboard-page" className="dashboard-page flex flex-col gap-6">
      <DashboardHeader
        filtersExpanded={filtersExpanded}
        onToggleFilters={() => setFiltersExpanded((v) => !v)}
        onNewAction={handleCreate}
      />

      <div id="dashboard-toolbar" className="dashboard-toolbar-wrapper">
        <KanbanToolbar
          filter={filter}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          visible={filtersExpanded}
        />
      </div>

      <section id="dashboard-section-metrics" className="dashboard-section-metrics">
        <h2 className="sr-only">Métricas del día</h2>
        <DashboardKpiCards metricas={metricas} isLoading={isLoading} />
      </section>

      <section
        id="dashboard-section-o2c-global"
        className="dashboard-section-o2c rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden"
      >
        <div className="border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <LineChart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 id="dashboard-o2c-title" className="text-sm font-semibold text-foreground">
                Score global O2C
              </h2>
              <p className="text-xs text-muted-foreground">
                Portafolio ponderado (KPIs de catálogo) y evolución desde snapshots
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            {o2cScoreLoading ? (
              <div className="flex min-h-[120px] items-center rounded-lg border border-dashed border-muted-foreground/25 px-4">
                <p className="text-sm text-muted-foreground">Cargando score O2C…</p>
              </div>
            ) : (
              <GlobalScoreWidget score={o2cGlobalScore} breakdown={o2cBreakdown} coverage={o2cCoverage} />
            )}
            <GlobalScoreHistoryChart
              limit={90}
              title="Evolución del score global"
              description="Serie desde snapshots (0–100%). Puede alimentarse por proceso batch o cierre."
            />
          </div>
        </div>
      </section>

      <div id="dashboard-section-actions" className="dashboard-section-actions">
        <DashboardActionsSection
          acciones={acciones}
          isLoading={isLoading}
          commentCounts={commentCounts}
          responsableNames={responsableNames}
          checklistProgressByAccionId={checklistProgressByAccionId}
          onSelectAccion={handleSelectAccion}
          onNewAction={handleCreate}
        />
      </div>

      <section id="dashboard-section-semaforo" className="dashboard-section-semaforo rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="dashboard-semaforo-header border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 id="dashboard-semaforo-title" className="text-sm font-semibold text-foreground">
                Semáforo KPI
              </h2>
              <p className="text-xs text-muted-foreground">
                Catálogo O2C: cumplimiento, semáforo y acciones vinculadas por KPI
              </p>
            </div>
          </div>
        </div>
        <div className="dashboard-semaforo-content p-4">
          <CatalogKpiSemaforoGrid metricItems={o2cMetricItems} isLoading={o2cScoreLoading} />
        </div>
      </section>

      <AccionFormDialog
        dialogId="dashboard-accion-dialog"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accion={editingAccion}
        defaultFecha={filter.fecha_creacion ?? today}
        onSuccess={handleDialogSuccess}
        responsableNames={responsableNames}
      />
    </div>
  )
}
