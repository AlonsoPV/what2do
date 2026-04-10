/**
 * Feature: Métricas (spec §4.2, §5.2 semáforo, §5.4 disciplina, §12)
 * Semáforo KPI (legacy aislado en `./legacy`), disciplina (por usuario/día).
 */

export { useKpiSemaforo, type KpiSemaforoItem } from './hooks/useKpiSemaforo'
export { useDisciplinaMetrics, type DisciplinaMetrics } from './hooks/useDisciplinaMetrics'
export { KPISemaforoCard } from './components/KPISemaforoCard'
export { DisciplinaCard } from './components/DisciplinaCard'
export { getKpiLabel } from './constants/kpi-labels'

/** @deprecated Semáforo legacy (`kpis`). Usar `CatalogKpiSemaforoGrid` desde `@/features/kpi`. */
export { KPISemaforoGrid, type KPISemaforoGridProps } from './legacy'
