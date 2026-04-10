import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type GlobalScoreBreakdown = {
  on_track: number
  at_risk: number
  off_track: number
  sin_datos: number
}

export type GlobalScoreCoverage = {
  totalKpiCount: number
  eligibleKpiCount: number
  totalWeight: number
  eligibleWeight: number
  missingWeight: number
}

export function GlobalScoreWidget({
  score,
  breakdown,
  coverage,
  subtitle,
}: {
  /** 0–1 o null si no aplica */
  score: number | null
  breakdown: GlobalScoreBreakdown
  coverage: GlobalScoreCoverage
  subtitle?: string
}) {
  const pct = score != null && Number.isFinite(score) ? Math.round(score * 1000) / 10 : null
  const coveragePct =
    coverage.totalWeight > 0 ? Math.round((coverage.eligibleWeight / coverage.totalWeight) * 1000) / 10 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Score global O2C</CardTitle>
        <CardDescription>
          {subtitle ??
            'Ponderado sobre KPIs del portafolio global (pesos activos). Usa medición o valor en catálogo; si faltan, la línea base como punto de partida para el cálculo.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums tracking-tight">
            {pct != null ? `${pct}%` : '—'}
          </span>
          {pct == null && <span className="text-sm text-muted-foreground">Sin datos suficientes</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <BreakdownPill label="En meta" value={breakdown.on_track} variant="ok" />
          <BreakdownPill label="En riesgo" value={breakdown.at_risk} variant="warn" />
          <BreakdownPill label="Fuera" value={breakdown.off_track} variant="bad" />
          <BreakdownPill label="Sin datos" value={breakdown.sin_datos} variant="muted" />
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Cobertura del score: {coverage.eligibleKpiCount}/{coverage.totalKpiCount} KPIs ({coveragePct}% del peso).
          {coverage.missingWeight > 0 ? (
            <span className="ml-1">
              Falta {Math.round(coverage.missingWeight * 10000) / 100}% del peso por datos no elegibles.
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownPill({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'ok' | 'warn' | 'bad' | 'muted'
}) {
  const cls =
    variant === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      : variant === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
        : variant === 'bad'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-muted bg-muted/50 text-muted-foreground'

  return (
    <div className={cn('rounded-lg border px-2 py-1.5', cls)}>
      <div className="text-[10px] uppercase opacity-80">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
