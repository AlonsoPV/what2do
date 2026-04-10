/**
 * Semáforo y hooks sobre tablas **legacy** `kpis` / `kpi_mediciones`.
 * Aislado aquí para no mezclar con el flujo O2C (`catalog_kpis` / `catalog_kpi_measurements`).
 *
 * @deprecated Preferir `CatalogKpiSemaforoGrid` y hooks en `@/features/kpi`.
 */

export { KPISemaforoGrid, type KPISemaforoGridProps } from '../components/KPISemaforoGrid'
