/**
 * Dashboard ejecutivo: salud del portafolio, KPIs, cadena, prioridad, pulso por filtros y acciones del día.
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  ChainStatCard,
  type GlobalScoreEvolutionCopy,
  useGapKpiLinks,
  useGlobalScoreEvolution,
} from '@/features/kpi'
import { useImpactMatrix } from '@/features/kpi/hooks/useImpactMatrix'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { AccionDiaria } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'
import {
  dropdownOptionsByCatalogKeyQueryKey,
  fetchDropdownOptionsByCatalogKey,
} from '@/features/catalogs/hooks/useDropdownOptions'
import { DashboardScoreAndRoadmapSection } from './components/DashboardScoreAndRoadmapSection'
import { DashboardHeader } from './components/DashboardHeader'
import { DashboardKpiCards } from './components/DashboardKpiCards'
import { DashboardActionsSection } from './components/DashboardActionsSection'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { InfoHint } from '@/components/InfoHint'
import { Button } from '@/components/ui/button'
import { Activity, ChevronRight, Target } from 'lucide-react'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import { ROUTES } from '@/constants'

const DEFAULT_FILTER: AccionesFilter = {}

function ImpactTableSkeleton() {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Cargando prioridades">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-3 border-b border-border/35 py-3 last:border-b-0 sm:flex-nowrap"
        >
          <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-muted sm:max-w-[45%]" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted sm:ml-auto" />
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const qc = useQueryClient()
  const today = todayWallClockCDMX()
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
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)

  const filterForQuery = useMemo(() => {
    const f: AccionesFilter = { ...filter }
    if (f.fecha_creacion === '' || f.fecha_creacion == null) {
      delete f.fecha_creacion
    }
    return f
  }, [filter])
  const { data: acciones = [], isLoading } = useAcciones(filterForQuery)
  const accionIds = useMemo(() => acciones.map((a) => a.id), [acciones])
  const { data: commentCounts = {} } = useCommentCounts(accionIds)
  const { data: checklistProgressByAccionId = {} } = useChecklistProgressByAccionIds(accionIds)
  const { data: users = [] } = useUsers({ activo: true })

  const metricas = useMemo(() => metricasFromAcciones(acciones), [acciones])

  const {
    isLoading: o2cScoreLoading,
    globalScore,
    portfolioBreakdown,
    coverage,
    portfolioMetricItems: o2cPortfolioMetricItems,
    snapshotsLoading,
    snapshotsSortedAsc,
    trend,
    deltaVsPreviousLine,
    trendLine,
    windowLine,
    weightSum,
    weightWarning,
  } = useGlobalScoreEvolution({ snapshotLimit: 60 })

  const evolutionCopy = useMemo((): GlobalScoreEvolutionCopy => {
    return {
      snapshotsLoading,
      trend,
      deltaVsPreviousLine,
      trendLine,
      windowLine,
      canComparePrevious: snapshotsSortedAsc.length >= 2,
    }
  }, [
    snapshotsLoading,
    trend,
    deltaVsPreviousLine,
    trendLine,
    windowLine,
    snapshotsSortedAsc.length,
  ])

  const { links, isLoading: gapLinksLoading } = useGapKpiLinks()
  const { rows: impactRows, isLoading: impactMatrixLoading } = useImpactMatrix()

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => {
      map[u.id] = u.nombre
    })
    return map
  }, [users])

  const chainSummary = useMemo(() => {
    const gapsCerrados = links.filter((l) => l.estado === 'cerrado').length
    const gapsEnProgreso = links.filter((l) => l.estado === 'en_progreso').length
    const gapsAbiertos = links.filter((l) => l.estado === 'abierto').length
    const ptsTotal = links.reduce((sum, l) => sum + l.totalPuntosGap, 0)
    const ptsDone = links.reduce((sum, l) => sum + l.puntosCompletados, 0)
    const avanceGlobal = ptsTotal > 0 ? ptsDone / ptsTotal : 0
    return { gapsCerrados, gapsEnProgreso, gapsAbiertos, avanceGlobal, ptsTotal, ptsDone }
  }, [links])

  const topPendientes = useMemo(
    () =>
      impactRows
        .filter((r) => r.estado !== 'Hecho' && r.estado !== 'Verificado')
        .slice(0, 5),
    [impactRows]
  )

  const advancedFiltersActive = Boolean(
    filter.estado != null ||
      filter.prioridad != null ||
      (filter.area != null && filter.area !== '') ||
      filter.responsable != null
  )

  const handleFilterChange = useCallback((next: AccionesFilter | Partial<AccionesFilter>) => {
    setFilter((prev) => {
      const merged: AccionesFilter = { ...prev, ...next }
      if (Object.prototype.hasOwnProperty.call(next, 'fecha_creacion')) {
        const f = next.fecha_creacion
        if (f === undefined || f === null || f === '') {
          delete merged.fecha_creacion
        } else if (typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f)) {
          merged.fecha_creacion = f
        } else {
          merged.fecha_creacion = today
        }
      }
      return merged
    })
  }, [today])

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
    <div id="dashboard-page" className="dashboard-page min-h-0">
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-3 py-5 sm:space-y-8 sm:px-6 sm:py-6">
        <section
          className="dashboard-control-center space-y-5 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm ring-1 ring-black/5 dark:bg-card/20 dark:ring-white/10 sm:p-6"
          aria-labelledby="dashboard-title"
        >
          <DashboardHeader
            filtersExpanded={filtersExpanded}
            advancedFiltersActive={advancedFiltersActive}
            onToggleFilters={() => setFiltersExpanded((v) => !v)}
            onNewAction={handleCreate}
          />

          <div
            id="dashboard-toolbar"
            className="dashboard-toolbar-wrapper sticky top-0 z-30 -mx-4 -mt-1 border-y border-border/40 bg-background/88 px-4 py-3 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.1)] backdrop-blur-md sm:-mx-6 sm:px-6 dark:bg-background/85 dark:shadow-[0_6px_16px_-8px_rgba(0,0,0,0.38)]"
          >
            <KanbanToolbar
              filter={filter}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
              layout="dashboard"
              advancedExpanded={filtersExpanded}
            />
          </div>
        </section>

        <DashboardScoreAndRoadmapSection
          scoreLoading={o2cScoreLoading}
          globalScore={globalScore}
          portfolioBreakdown={portfolioBreakdown}
          coverage={coverage}
          evolution={evolutionCopy}
          weightSum={weightSum}
          weightWarning={weightWarning}
        />

        <section id="dashboard-section-semaforo" className="dashboard-section-semaforo scroll-mt-4">
          <SectionCard>
            <SectionCardHeader
              icon={Activity}
              eyebrow="Catálogo KPI"
              title="Semáforo por KPI"
              subtitle="Salud operativa por KPI: cumplimiento respecto a meta activa (no es el avance del roadmap)."
            />
            <SectionCardBody className="dashboard-semaforo-content">
              <CatalogKpiSemaforoGrid
                metricItems={o2cPortfolioMetricItems}
                isLoading={o2cScoreLoading}
              />
            </SectionCardBody>
          </SectionCard>
        </section>

        <section id="dashboard-section-chain" className="scroll-mt-4">
          <SectionCard>
            <SectionCardHeader
              eyebrow="Cadena estratégica"
              title="Story → Gap → KPI"
              subtitle="Avance del portafolio de brechas vinculadas al tablero."
            />
            <SectionCardBody>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                <ChainStatCard
                  label="Avance del roadmap"
                  value={`${Math.round(chainSummary.avanceGlobal * 100)}%`}
                  hint="Story points completados sobre el total del portafolio de gaps activos."
                  color="primary"
                  isLoading={gapLinksLoading}
                />
                <ChainStatCard
                  label="Gaps cerrados"
                  value={chainSummary.gapsCerrados}
                  hint="Gaps con backlog completado; el KPI asociado puede avanzar sin bloqueo de gap."
                  color="emerald"
                  isLoading={gapLinksLoading}
                />
                <ChainStatCard
                  label="En progreso"
                  value={chainSummary.gapsEnProgreso}
                  hint={`Abiertos sin cerrar: ${chainSummary.gapsAbiertos}`}
                  color="amber"
                  isLoading={gapLinksLoading}
                />
                <ChainStatCard
                  label="Story points"
                  value={`${chainSummary.ptsDone} / ${chainSummary.ptsTotal}`}
                  hint="Hecho sobre total ponderado en gaps."
                  color="muted"
                  isLoading={gapLinksLoading}
                />
              </div>
            </SectionCardBody>
          </SectionCard>
        </section>

        <section id="dashboard-section-top-impact" className="scroll-mt-4">
          <SectionCard>
            <SectionCardHeader
              eyebrow="Priorización"
              title="Mayor impacto pendiente"
              subtitle="Ordenadas por impacto; alinea ejecución con el tablero O2C."
              action={
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  <InfoHint text="Las cinco acciones abiertas con mayor aporte estimado según peso del KPI y story points del gap. Completarlas desbloquea avance en gap y KPI." />
                  <Button variant="outline" size="sm" className="border-border/60 bg-background/80" asChild>
                    <Link to={ROUTES.DASHBOARD_IMPACTO} className="gap-1">
                      Matriz de impacto
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              }
            />
            <SectionCardBody>
              {impactMatrixLoading || gapLinksLoading ? (
                <ImpactTableSkeleton />
              ) : topPendientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5 px-6 py-12 text-center">
                  <Target className="mb-3 h-10 w-10 text-muted-foreground/35" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Nada que priorizar por impacto</p>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    No hay acciones abiertas con impacto calculado, o el conjunto actual no produce ranking.
                    Revisa gaps y acciones en la matriz.
                  </p>
                  <Button variant="link" asChild className="mt-3 h-auto p-0 text-sm font-medium">
                    <Link to={ROUTES.DASHBOARD_IMPACTO}>Abrir matriz de impacto</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-xs font-medium text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Acción</th>
                        <th className="pb-3 pr-4 font-medium">Gap</th>
                        <th className="pb-3 pr-3 text-right font-medium">Pts</th>
                        <th className="pb-3 text-right font-medium">Impacto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPendientes.map((row) => (
                        <tr
                          key={row.accionId}
                          className="border-b border-border/35 transition-colors last:border-0 hover:bg-muted/20"
                        >
                          <td className="py-3 pr-4 align-top">
                            <span className="block max-w-[180px] truncate font-medium leading-snug sm:max-w-none">
                              {row.titulo}
                            </span>
                          </td>
                          <td className="py-3 pr-4 align-top text-muted-foreground">{row.gapNombre ?? '—'}</td>
                          <td className="py-3 pr-3 align-top text-right tabular-nums text-muted-foreground">
                            {row.storyPoints ?? '—'}
                          </td>
                          <td className="py-3 align-top text-right">
                            <span className="font-semibold tabular-nums text-primary">
                              {row.impactoPct != null ? (row.impactoPct * 100).toFixed(1) : '—'}
                            </span>
                            {row.impactoPct != null ? (
                              <span className="text-xs text-muted-foreground">%</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCardBody>
          </SectionCard>
        </section>

        <div id="dashboard-section-actions" className="dashboard-section-actions scroll-mt-4">
          <DashboardActionsSection
            acciones={acciones}
            isLoading={isLoading}
            commentCounts={commentCounts}
            responsableNames={responsableNames}
            checklistProgressByAccionId={checklistProgressByAccionId}
            onSelectAccion={handleSelectAccion}
            onNewAction={handleCreate}
            fechaResumen={filter.fecha_creacion ?? today}
          />
        </div>

        <section
          id="dashboard-section-metrics"
          className="dashboard-section-metrics scroll-mt-4 border-t border-border/40 pt-8"
        >
          <SectionCard>
            <SectionCardHeader
              eyebrow="Pulso operativo"
              title="Resumen de acciones"
              subtitle="Totales según filtros activos."
            />
            <SectionCardBody>
              <DashboardKpiCards metricas={metricas} isLoading={isLoading} />
            </SectionCardBody>
          </SectionCard>
        </section>
      </div>

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
