/**
 * Semáforo KPI basado en catálogo O2C (`catalog_kpis` + última medición).
 * Sustituye el grid legacy (`kpis` / `kpi_mediciones`) en el dashboard ejecutivo.
 */

import { Activity, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogKpiMetricItem } from '../hooks/useCatalogKpiMetricsList'
import { useCatalogKpiAccionImpactCounts } from '../hooks/useCatalogKpiAccionImpactCounts'
import { useCatalogKpiO2cMetricItems } from '../hooks/useCatalogKpiO2cMetricItems'
import type { KpiComplianceStatus } from '../utils/kpiCalculations'
import {
  DEFAULT_O2C_TARGET_HORIZON,
  resolveEffectiveStatusThresholds,
  type TargetHorizon,
} from '../utils/kpiCalculations'

export type CatalogKpiSemaforoGridProps = {
  /** Si se pasan, no se vuelve a consultar (misma semántica que el tablero KPIs / filtros). */
  metricItems?: CatalogKpiMetricItem[]
  isLoading?: boolean
  activo?: boolean
  targetHorizon?: TargetHorizon
  /** Mensaje cuando `metricItems` está vacío (p. ej. filtros sin coincidencias). */
  emptyMessage?: string
  className?: string
  /** Muestra conteo de acciones vinculadas al KPI (catálogo + operaciones). */
  showAccionImpact?: boolean
}

const CARD: Record<
  'verde' | 'amarillo' | 'rojo' | 'gris',
  string
> = {
  verde: 'bg-emerald-500/10 border-emerald-500/30 [&_.dot]:bg-emerald-500',
  amarillo: 'bg-amber-500/10 border-amber-500/30 [&_.dot]:bg-amber-500',
  rojo: 'bg-red-500/10 border-red-500/30 [&_.dot]:bg-red-500',
  gris: 'bg-muted/30 border-muted [&_.dot]:bg-muted-foreground',
}

const BAR: Record<'verde' | 'amarillo' | 'rojo' | 'gris', string> = {
  verde: 'bg-emerald-500',
  amarillo: 'bg-amber-500',
  rojo: 'bg-red-500',
  gris: 'bg-muted-foreground/40',
}

function band(
  compliance: number | null,
  status: KpiComplianceStatus | null
): 'verde' | 'amarillo' | 'rojo' | 'gris' {
  if (compliance === null || status === null) return 'gris'
  if (status === 'on_track') return 'verde'
  if (status === 'at_risk') return 'amarillo'
  return 'rojo'
}

export function CatalogKpiSemaforoGrid({
  metricItems: metricItemsProp,
  isLoading: isLoadingProp,
  activo = true,
  targetHorizon = DEFAULT_O2C_TARGET_HORIZON,
  emptyMessage,
  className,
  showAccionImpact = true,
}: CatalogKpiSemaforoGridProps = {}) {
  const external = metricItemsProp !== undefined
  const internal = useCatalogKpiO2cMetricItems({
    activo,
    targetHorizon,
    enabled: !external,
  })
  const metricItems = external ? metricItemsProp : internal.metricItems
  const isLoading = external ? Boolean(isLoadingProp) : internal.isLoading

  const { data: impactByKpiId = {}, isLoading: impactLoading } = useCatalogKpiAccionImpactCounts({
    enabled: showAccionImpact,
  })

  if (isLoading) {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-h-[118px] animate-pulse rounded-xl border border-border/50 bg-muted/20"
          />
        ))}
      </div>
    )
  }

  if (metricItems.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center',
          className
        )}
      >
        <Activity className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {emptyMessage ??
            'No hay KPIs de catálogo activos. Configúralos en Catálogos → KPIs.'}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {metricItems.map((item) => {
        const { row, metric, compliance, status } = item
        const pct =
          compliance != null && Number.isFinite(compliance)
            ? Math.round(compliance * 1000) / 10
            : null
        const color = band(compliance, status)
        const { greenMin, yellowMin } = resolveEffectiveStatusThresholds(metric)
        const impact = showAccionImpact ? (impactByKpiId[row.id] ?? 0) : null
        const title =
          `Cumplimiento ${pct != null ? `${pct}%` : 'sin datos'} · umbrales ≥${(greenMin * 100).toFixed(0)}% / ≥${(yellowMin * 100).toFixed(0)}%` +
          (showAccionImpact && !impactLoading
            ? ` · ${impact === 0 ? 'Sin acciones vinculadas' : `${impact} acción${impact === 1 ? '' : 'es'} con impacto`}`
            : '')

        return (
          <div
            key={row.id}
            className={cn(
              'rounded-xl border px-4 py-3 shadow-sm transition-shadow hover:shadow-md',
              CARD[color]
            )}
            title={title}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="dot h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
                <span className="truncate text-sm font-medium text-foreground">{row.nombre}</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-0.5">
                <span className="text-xl font-semibold tabular-nums text-foreground">
                  {pct != null ? pct : '—'}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className={cn('h-full rounded-full transition-all duration-500', BAR[color])}
                style={{ width: `${pct != null ? Math.min(100, Math.max(0, pct)) : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Umbrales: verde ≥ {(greenMin * 100).toFixed(0)}% · amarillo ≥ {(yellowMin * 100).toFixed(0)}%
            </p>
            {showAccionImpact && (
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <ListTodo className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
                  <span className="truncate">Impacto operativo</span>
                </span>
                {impactLoading ? (
                  <span className="text-xs tabular-nums text-muted-foreground">…</span>
                ) : impact != null && impact > 0 ? (
                  <span
                    className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary"
                    title={`${impact} acción${impact === 1 ? '' : 'es'} vinculadas a este KPI`}
                  >
                    {impact} acción{impact === 1 ? '' : 'es'}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground">Sin vínculos</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
