import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CatalogKpiO2cRow } from '../types/kpi.types'
import type { KpiComplianceStatus } from '../utils/kpiCalculations'

export type KpiCardViewModel = {
  row: CatalogKpiO2cRow
  gapLabel: string | null
  ownerLabel: string | null
  compliancePct: number | null
  status: KpiComplianceStatus | null
  weight: number | null
  trendDelta: number | null
  /** Cumplimiento de la penúltima medición (0–1), para comparar con la última. */
  prevCompliancePct: number | null
  /** Sin medición reciente ni current_value válido */
  noData: boolean
  /** `gap_id` en BD pero el gap no está en la lista cargada (referencia rota). */
  orphanGap?: boolean
  /** Meta efectiva y umbrales de semáforo (horizonte M6/M12/M18). */
  metaLine?: string | null
  currentValue: number | null
  targetValue: number | null
  unit: string
}

function statusBadgeVariant(
  status: KpiComplianceStatus | null,
  noData: boolean
): 'success' | 'secondary' | 'destructive' | 'muted' {
  if (noData) return 'muted'
  if (status === 'on_track') return 'success'
  if (status === 'at_risk') return 'secondary'
  return 'destructive'
}

function statusLabel(status: KpiComplianceStatus | null, noData: boolean): string {
  if (noData) return 'Sin datos'
  if (status === 'on_track') return 'En meta'
  if (status === 'at_risk') return 'En riesgo'
  if (status === 'off_track') return 'Fuera de meta'
  return '—'
}

export function KpiCard({ vm }: { vm: KpiCardViewModel }) {
  const {
    row,
    gapLabel,
    ownerLabel,
    compliancePct,
    status,
    weight,
    trendDelta,
    prevCompliancePct,
    noData,
    orphanGap,
    metaLine,
    currentValue,
    targetValue,
    unit,
  } = vm
  const barPct = compliancePct != null ? Math.round(compliancePct * 100) : 0
  const prevBarPct = prevCompliancePct != null ? Math.round(prevCompliancePct * 100) : null
  const showTrendBars = prevCompliancePct != null && compliancePct != null && !noData

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">{row.nombre}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {!row.gap_id && (
              <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                Sin gap
              </Badge>
            )}
            {orphanGap && (
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                Gap no encontrado
              </Badge>
            )}
            <Badge variant={statusBadgeVariant(status, noData)}>{statusLabel(status, noData)}</Badge>
          </div>
        </div>
        {(gapLabel || ownerLabel) && (
          <p className="text-xs text-muted-foreground">
            {[gapLabel && `Gap: ${gapLabel}`, ownerLabel && `Resp.: ${ownerLabel}`].filter(Boolean).join(' · ')}
          </p>
        )}
        {metaLine ? (
          <p className="text-xs text-muted-foreground/90">{metaLine}</p>
        ) : null}
        <div className="text-xs text-muted-foreground">
          Actual:{' '}
          <span className="font-medium text-foreground tabular-nums">
            {currentValue != null && Number.isFinite(currentValue) ? currentValue : '—'}
          </span>{' '}
          {unit} · Meta:{' '}
          <span className="font-medium text-foreground tabular-nums">
            {targetValue != null && Number.isFinite(targetValue) ? targetValue : '—'}
          </span>{' '}
          {unit}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Cumplimiento</span>
            <span className="font-medium tabular-nums text-foreground">
              {noData ? '—' : `${barPct}%`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                noData && 'bg-muted-foreground/30',
                !noData && status === 'on_track' && 'bg-emerald-500',
                !noData && status === 'at_risk' && 'bg-amber-500',
                !noData && status === 'off_track' && 'bg-destructive'
              )}
              style={{ width: noData ? '0%' : `${barPct}%` }}
            />
          </div>
        </div>
        {showTrendBars && (
          <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Última vs penúltima medición
            </p>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-16 shrink-0 text-muted-foreground">Anterior</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-muted-foreground/45"
                  style={{ width: `${prevBarPct}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                {prevBarPct}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-16 shrink-0 font-medium text-foreground">Última</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full',
                    status === 'on_track' && 'bg-emerald-500',
                    status === 'at_risk' && 'bg-amber-500',
                    status === 'off_track' && 'bg-destructive'
                  )}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right tabular-nums font-medium text-foreground">
                {barPct}%
              </span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Peso:{' '}
            <span className="font-medium text-foreground">
              {weight != null && Number.isFinite(weight) ? `${(weight * 100).toFixed(1)}%` : '—'}
            </span>
          </span>
          {trendDelta != null && Number.isFinite(trendDelta) && (
            <span
              className={cn(
                'tabular-nums',
                trendDelta > 0 && 'text-emerald-600 dark:text-emerald-400',
                trendDelta < 0 && 'text-rose-600 dark:text-rose-400',
                trendDelta === 0 && 'text-muted-foreground'
              )}
            >
              {trendDelta > 0 ? '↑' : trendDelta < 0 ? '↓' : '→'}{' '}
              {trendDelta > 0 ? '+' : ''}
              {(trendDelta * 100).toFixed(1)} pp vs anterior
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
