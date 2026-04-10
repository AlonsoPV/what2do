/**
 * Grid del semáforo KPI — tablas legacy `kpis` / `kpi_mediciones`.
 *
 * @deprecated Usar `CatalogKpiSemaforoGrid` desde `@/features/kpi` (catálogo O2C y mediciones
 *   `catalog_kpi_measurements`). El dashboard ejecutivo ya no usa este componente por defecto.
 */

import { Activity } from 'lucide-react'
import { useKpiSemaforo, type KpiSemaforoItem } from '../hooks/useKpiSemaforo'
import { KPISemaforoCard } from './KPISemaforoCard'
import type { KpiUnidad } from '@/types'

const UNIDAD_LABELS: Record<KpiUnidad, string> = {
  porcentaje: '%',
  numero: '#',
  dias: 'días',
  moneda: '$',
}

export interface KPISemaforoGridProps {
  fecha: string
}

export function KPISemaforoGrid({ fecha }: KPISemaforoGridProps) {
  const { items, isLoading, isError, error } = useKpiSemaforo(fecha)

  if (isLoading) {
    return (
      <div id="dashboard-kpi-semaforo-grid" className="dashboard-kpi-semaforo-grid dashboard-kpi-semaforo-grid-skeleton grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-xl border border-border/50 bg-muted/20"
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div id="dashboard-kpi-semaforo-grid" className="dashboard-kpi-semaforo-grid dashboard-kpi-semaforo-grid-error rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Error al cargar semáforo'}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div id="dashboard-kpi-semaforo-grid" className="dashboard-kpi-semaforo-grid dashboard-kpi-semaforo-grid-empty flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No hay KPIs configurados. Configura metas en catálogos.
        </p>
      </div>
    )
  }

  return (
    <div id="dashboard-kpi-semaforo-grid" className="dashboard-kpi-semaforo-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item: KpiSemaforoItem) => (
        <KPISemaforoCard
          key={item.kpi.id}
          nombreKpi={item.kpi.nombre_kpi}
          valor={item.valor}
          color={item.color}
          unidad={UNIDAD_LABELS[item.kpi.unidad] ?? '%'}
          title={
            item.meta
              ? `Umbral alerta: ${item.meta.umbral_alerta} · Crítico: ${item.meta.umbral_critico}`
              : undefined
          }
        />
      ))}
    </div>
  )
}
