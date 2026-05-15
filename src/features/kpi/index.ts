export {
  invalidateAfterCatalogKpiMeasurement,
  invalidateAfterGapLinkedAction,
  KPI_STALE_TIME_LIST_MS,
  KPI_STALE_TIME_MEASUREMENTS_MS,
  kpiQueryKeys,
} from './kpiQueryKeys'
export * from './hooks'
export * from './types/kpi.types'
export * from './utils/kpiCalculations'
export {
  calculateKpiCompliance,
  getActiveTarget,
  normalizeKpiWeightsForEligible,
} from './utils/o2cScoreEngine'
export type { GlobalScoreChartRange } from './utils/globalScoreEvolution'

export {
  getLatestMeasurement,
  insertCatalogKpiMeasurement,
  listLatestMeasurementsForCatalogKpiIds,
  listMeasurementsByCatalogKpiId,
  listRecentMeasurementsPerKpi,
} from './services/catalogKpiMeasurements.service'
export type {
  InsertCatalogKpiMeasurementInput,
  MeasurementsListOpts,
} from './services/catalogKpiMeasurements.service'
export { getCatalogKpiO2cById, listCatalogKpisO2c } from './services/catalogKpisO2c.service'
export { getGapById, listGaps } from './services/gaps.service'
export { listAccionesForGapIds } from './services/gapAcciones.service'
export {
  listGlobalScoreSnapshots,
  recordGlobalScoreSnapshot,
} from './services/globalScoreSnapshots.service'
export type { GlobalScoreSnapshotsOpts } from './services/globalScoreSnapshots.service'

export { KpisDashboardPage } from './pages/KpisDashboardPage'
export { GapsDashboardPage } from './pages/GapsDashboardPage'
export { ImpactMatrixPage } from './pages/ImpactMatrixPage'
export { GlobalScoreWidget } from './components/GlobalScoreWidget'
export { GlobalScoreMdSpecPanel } from './components/GlobalScoreMdSpecPanel'
export type { GlobalScoreBreakdown, GlobalScoreCoverage, GlobalScoreEvolutionCopy } from './components/GlobalScoreWidget'
export { GlobalScoreHistoryChart } from './components/GlobalScoreHistoryChart'
export { KpiCard } from './components/KpiCard'
export type { KpiCardViewModel } from './components/KpiCard'
export { ChainStatCard } from './components/ChainStatCard'
export { GapCard } from './components/GapCard'
export type { GapCardViewModel, GapStoryImpactRow, GapBusinessSeverity, KpiSemaforoCounts } from './components/GapCard'
export {
  CatalogKpiSemaforoGrid,
  type CatalogKpiSemaforoGridProps,
} from './components/CatalogKpiSemaforoGrid'
export { KpiMeasurementDialog } from './components/KpiMeasurementDialog'
export { computeGapStoryProgress, accionStoryPoints, isAccionEstadoDone } from './utils/gapProgress'
export * from './utils/impactCalculations'
export * from './utils/storyPointsMethodology'
