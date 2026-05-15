/**
 * Semáforo KPI basado en catálogo O2C (`catalog_kpis` + última medición).
 * Sustituye el grid legacy (`kpis` / `kpi_mediciones`) en el dashboard ejecutivo.
 */

import { useState } from 'react'
import { Activity, ClipboardPlus } from 'lucide-react'
import type { CatalogKpi } from '@/features/catalogs/types/catalogs.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import { useCatalogKpiAccionImpactCounts } from '../hooks/useCatalogKpiAccionImpactCounts'
import { useCatalogKpiO2cMetricItems } from '../hooks/useCatalogKpiO2cMetricItems'
import {
  calculateWeightedScore,
  DEFAULT_O2C_TARGET_HORIZON,
  resolveEffectiveStatusThresholds,
  resolveTarget,
  type CatalogKpiMetricComputed,
  type KpiComplianceStatus,
  type TargetHorizon,
} from '../utils/kpiCalculations'
import { KpiMeasurementDialog } from './KpiMeasurementDialog'

export type CatalogKpiSemaforoGridProps = {
  /** Si se pasan, no se vuelve a consultar (misma semántica que el tablero KPIs / filtros). */
  metricItems?: CatalogKpiMetricComputed[]
  isLoading?: boolean
  activo?: boolean
  targetHorizon?: TargetHorizon
  /** Mensaje cuando `metricItems` está vacío (p. ej. filtros sin coincidencias). */
  emptyMessage?: string
  className?: string
  /** Muestra conteo de acciones vinculadas al KPI (catálogo + operaciones). */
  showAccionImpact?: boolean
  /** Botón para abrir diálogo de medición por KPI. */
  showRegisterMeasurement?: boolean
}

const BAR: Record<'verde' | 'amarillo' | 'rojo' | 'gris', string> = {
  verde: 'bg-emerald-500',
  amarillo: 'bg-amber-500',
  rojo: 'bg-red-500',
  gris: 'bg-muted-foreground/40',
}

function horizonShortLabel(h: TargetHorizon): string {
  switch (h) {
    case 'm6':
      return 'M6'
    case 'm12':
      return 'M12'
    case 'm18':
    default:
      return 'M18'
  }
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
  showRegisterMeasurement = true,
}: CatalogKpiSemaforoGridProps = {}) {
  const [measureFor, setMeasureFor] = useState<CatalogKpi | null>(null)

  const external = metricItemsProp !== undefined
  const internal = useCatalogKpiO2cMetricItems({
    activo,
    targetHorizon,
    enabled: !external,
  })
  const metricItems = external ? metricItemsProp : internal.metricItems
  const isLoading = external ? Boolean(isLoadingProp) : internal.isLoading
  const isError = external ? false : internal.isError

  const { data: impactByKpiId = {}, isLoading: impactLoading } = useCatalogKpiAccionImpactCounts({
    enabled: showAccionImpact,
  })

  if (isLoading) {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[156px] animate-pulse rounded-xl border border-border/60 bg-muted/20"
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={cn(
          'rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive',
          className
        )}
      >
        No fue posible cargar los KPIs. Intenta recargar la página.
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
    <>
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {metricItems.map((item) => {
          const { row, metric, compliance, status, latestMeasurement } = item
          const catalogHasCurrent =
            row.current_value != null && Number.isFinite(row.current_value)
          const hasObservation = latestMeasurement != null || catalogHasCurrent

          const pct =
            compliance != null && Number.isFinite(compliance) && hasObservation
              ? Math.round(compliance * 1000) / 10
              : null
          const color = band(compliance, status)
          const { greenMin, yellowMin } = resolveEffectiveStatusThresholds(metric)
          const impact = showAccionImpact ? (impactByKpiId[row.id] ?? 0) : null
          const activeTarget = resolveTarget(metric, targetHorizon)
          const weightedPart = calculateWeightedScore(compliance, row.weight)
          const weightPct =
            typeof row.weight === 'number' && Number.isFinite(row.weight)
              ? Math.round(row.weight * 10000) / 100
              : null
          const aportePct =
            weightedPart != null ? Math.round(weightedPart * 1000) / 10 : null

          const title =
            `${hasObservation ? (pct != null ? `Cumplimiento ${pct}%` : 'Sin cumplimiento calculable') : 'Sin medición operativa'} · umbrales ≥${(greenMin * 100).toFixed(0)}% / ≥${(yellowMin * 100).toFixed(0)}%` +
            (showAccionImpact && !impactLoading
              ? ` · ${impact === 0 ? 'Sin acciones vinculadas' : `${impact} acción${impact === 1 ? '' : 'es'} con impacto`}`
              : '')

          const barPct =
            pct != null && hasObservation ? Math.min(100, Math.max(0, pct)) : 0

          return (
            <div
              key={row.id}
              className="flex flex-col rounded-xl border border-border/60 bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md [&_.dot]:rounded-full"
              title={title}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={cn('dot mt-1 h-2 w-2 shrink-0 rounded-full', {
                      'bg-emerald-500': color === 'verde',
                      'bg-amber-500': color === 'amarillo',
                      'bg-red-500': color === 'rojo',
                      'bg-muted-foreground/40': color === 'gris',
                    })}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium text-foreground">{row.nombre}</span>
                </div>
                {!hasObservation ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                    Sin medición
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 flex shrink-0 items-baseline gap-0.5">
                <span className="text-xl font-semibold tabular-nums text-foreground">
                  {pct != null ? pct : '—'}
                </span>
                {pct != null ? <span className="text-xs text-muted-foreground">%</span> : null}
              </div>

              <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', BAR[color])}
                  style={{ width: `${barPct}%` }}
                />
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] leading-tight text-muted-foreground">
                <dt className="font-medium text-muted-foreground/90">Valor actual</dt>
                <dd className="text-right tabular-nums text-foreground">
                  {metric.current != null && Number.isFinite(metric.current)
                    ? metric.current
                    : '—'}{' '}
                  <span className="text-muted-foreground">{row.unidad}</span>
                </dd>
                <dt className="font-medium text-muted-foreground/90">
                  Meta ({horizonShortLabel(targetHorizon)})
                </dt>
                <dd className="text-right tabular-nums text-foreground">
                  {activeTarget != null ? activeTarget : '—'}{' '}
                  <span className="text-muted-foreground">{row.unidad}</span>
                </dd>
                <dt className="font-medium text-muted-foreground/90">Peso portafolio</dt>
                <dd className="text-right tabular-nums text-foreground">
                  {weightPct != null ? `${weightPct}%` : '—'}
                </dd>
                <dt className="font-medium text-muted-foreground/90">Aporte ponderado</dt>
                <dd className="text-right tabular-nums text-foreground">
                  {aportePct != null ? `${aportePct}%` : '—'}
                </dd>
              </dl>

              <p className="mt-1 min-h-[2.25rem] text-[10px] leading-snug text-muted-foreground/80">
                Última medición:{' '}
                {latestMeasurement ? (
                  <>
                    <span className="font-medium tabular-nums text-foreground">
                      {latestMeasurement.valor}
                    </span>
                    {' · '}
                    {formatDateTimeCDMX(latestMeasurement.medido_en)}
                  </>
                ) : catalogHasCurrent ? (
                  <>
                    Sin filas en historial; usando{' '}
                    <span className="font-medium text-foreground">valor en catálogo</span>.
                  </>
                ) : (
                  'Sin medición registrada ni valor actual en catálogo.'
                )}
              </p>

              <p className="mt-1 text-[10px] text-muted-foreground/70">
                ≥{(greenMin * 100).toFixed(0)}% verde · ≥{(yellowMin * 100).toFixed(0)}% ámbar
              </p>

              {showAccionImpact && (
                <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-[11px] text-muted-foreground">Impacto operativo</span>
                  {impactLoading ? (
                    <span className="text-[11px] text-muted-foreground">…</span>
                  ) : impact != null && impact > 0 ? (
                    <span className="text-[11px] font-semibold tabular-nums text-primary">
                      {impact} acción{impact === 1 ? '' : 'es'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Sin vínculos</span>
                  )}
                </div>
              )}

              {showRegisterMeasurement ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 w-full gap-1.5 text-xs"
                  onClick={() => setMeasureFor(row as CatalogKpi)}
                >
                  <ClipboardPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Registrar medición
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>

      <KpiMeasurementDialog
        kpi={measureFor}
        open={measureFor != null}
        onOpenChange={(open) => {
          if (!open) setMeasureFor(null)
        }}
      />
    </>
  )
}
