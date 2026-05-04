import { cn } from '@/lib/utils'

export type KpiFilteredSummaryCounts = {
  total: number
  on_track: number
  at_risk: number
  off_track: number
  sin_datos: number
}

/**
 * Resumen semáforo para la tarjeta «Filtros y orden»: números grandes, prioridad a lo crítico.
 */
export function KpiFilteredSemaforoStrip({ summary }: { summary: KpiFilteredSummaryCounts }) {
  const { total, on_track, at_risk, off_track, sin_datos } = summary

  const withData = total - sin_datos
  const insight =
    total === 0
      ? 'Sin KPIs en esta vista: amplía filtros.'
      : sin_datos === total
        ? 'Ningún KPI visible tiene cumplimiento calculable.'
        : off_track > 0 && withData > 0 && off_track === withData
          ? 'Todos los KPIs con datos están fuera de meta.'
          : off_track === total
            ? 'Todos los KPIs visibles están fuera de meta.'
            : off_track > at_risk && off_track > on_track
              ? 'El portafolio visible está muy cargado hacia fuera de meta.'
              : at_risk > 0 && off_track === 0
                ? 'Hay KPIs en zona de riesgo; ninguno fuera aún.'
                : on_track > 0 && off_track === 0 && at_risk === 0
                  ? 'Los visibles con datos están en meta.'
                  : 'Distribución mixta en los KPIs visibles.'

  return (
    <div
      className="kpi-filter-semaforo space-y-4 border-b border-border/60 pb-5"
      aria-label="Semáforo de KPIs visibles según filtros"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Semáforo (vista actual)
        </p>
        <p className="text-sm font-medium leading-snug text-foreground">{insight}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SemaforoTile label="Fuera de meta" value={off_track} variant="bad" emphasize={off_track > 0} />
        <SemaforoTile
          label="En riesgo"
          value={at_risk}
          variant="warn"
          emphasize={at_risk > 0 && off_track === 0}
        />
        <SemaforoTile
          label="En meta"
          value={on_track}
          variant="ok"
          emphasize={on_track > 0 && off_track === 0 && at_risk === 0}
        />
        <SemaforoTile label="Sin datos" value={sin_datos} variant="muted" emphasize={sin_datos > 0} />
        <SemaforoTile
          label="Visibles"
          value={total}
          variant="neutral"
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </div>
  )
}

function SemaforoTile({
  label,
  value,
  variant,
  emphasize,
  className,
}: {
  label: string
  value: number
  variant: 'ok' | 'warn' | 'bad' | 'muted' | 'neutral'
  emphasize?: boolean
  className?: string
}) {
  const cls =
    variant === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/[0.12] text-emerald-950 dark:text-emerald-100'
      : variant === 'warn'
        ? 'border-amber-500/40 bg-amber-500/[0.12] text-amber-950 dark:text-amber-100'
        : variant === 'bad'
          ? 'border-destructive/45 bg-destructive/[0.12] text-destructive'
          : variant === 'muted'
            ? 'border-border/70 bg-muted/35 text-muted-foreground'
            : 'border-border/60 bg-muted/25 text-foreground'

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border px-3 py-3 shadow-sm transition-shadow sm:px-3.5 sm:py-3.5',
        cls,
        emphasize && 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background',
        className
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">{label}</span>
      <span className="mt-1 text-3xl font-bold tabular-nums leading-none sm:text-[2rem]">{value}</span>
    </div>
  )
}
