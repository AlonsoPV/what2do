import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ClipboardList, FolderKanban, Kanban } from 'lucide-react'
import { ROUTES } from '@/constants'
import { InfoHint } from '@/components/InfoHint'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { KPI_COMPLIANCE_CRITICAL_MAX } from '../utils/kpiCalculations'
import { MD_SPEC_MAX_COMPLIANCE_PCT } from '../utils/kpiMdSpecCalculations'
import { GlobalScoreHistoryChart } from './GlobalScoreHistoryChart'
import type { GlobalScoreChartRange } from '../utils/globalScoreEvolution'
import type { GlobalScoreSnapshot } from '../types/kpi.types'

export type PortfolioFilteredSummary = {
  total: number
  on_track: number
  at_risk: number
  off_track: number
  sin_datos: number
}

type PortfolioHealthEstado = 'critico' | 'riesgo' | 'alineado' | 'sin_datos'

function deriveEstado(
  summary: PortfolioFilteredSummary,
  o2cFraction: number | null
): PortfolioHealthEstado {
  if (summary.total === 0) return 'sin_datos'
  const withCompliance = summary.total - summary.sin_datos
  if (withCompliance <= 0) return 'sin_datos'
  if (summary.off_track > 0 || (o2cFraction != null && o2cFraction < 0.35)) return 'critico'
  if (summary.at_risk > 0 || (o2cFraction != null && o2cFraction < 0.65)) return 'riesgo'
  return 'alineado'
}

const ESTADO_COPY: Record<PortfolioHealthEstado, { label: string; badgeClass: string }> = {
  critico: {
    label: 'CRÍTICO',
    badgeClass: 'border-destructive/50 bg-destructive/15 text-destructive',
  },
  riesgo: {
    label: 'EN RIESGO',
    badgeClass: 'border-amber-500/45 bg-amber-500/12 text-amber-950 dark:text-amber-100',
  },
  alineado: {
    label: 'EN META',
    badgeClass: 'border-emerald-500/45 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100',
  },
  sin_datos: {
    label: 'SIN DATOS',
    badgeClass: 'border-muted bg-muted/50 text-muted-foreground',
  },
}

export type PortfolioHealthExecutiveSectionProps = {
  horizonLabel: string
  filteredSummary: PortfolioFilteredSummary
  /** Cumplimiento O2C agregado 0–1 para KPIs visibles. */
  filteredGlobalScore: number | null
  /** Puntos metodología documento (subconjunto filtrado). */
  mdGlobalScorePoints: number | null
  criticalKpiCount: number
  isLoading: boolean
  chartSeries: GlobalScoreSnapshot[]
  chartRange: GlobalScoreChartRange
  onChartRangeChange: (range: GlobalScoreChartRange) => void
  snapshotsLoading: boolean
  snapshotsError: boolean
}

export function PortfolioHealthExecutiveSection({
  horizonLabel,
  filteredSummary,
  filteredGlobalScore,
  mdGlobalScorePoints,
  criticalKpiCount,
  isLoading,
  chartSeries,
  chartRange,
  onChartRangeChange,
  snapshotsLoading,
  snapshotsError,
}: PortfolioHealthExecutiveSectionProps) {
  const o2cPct =
    filteredGlobalScore != null && Number.isFinite(filteredGlobalScore)
      ? Math.round(filteredGlobalScore * 100)
      : null

  const pts =
    mdGlobalScorePoints != null && Number.isFinite(mdGlobalScorePoints)
      ? Math.round(mdGlobalScorePoints * 10) / 10
      : null

  const estado = deriveEstado(filteredSummary, filteredGlobalScore)
  const estadoStyle = ESTADO_COPY[estado]

  const { on_track, at_risk, off_track, sin_datos, total } = filteredSummary
  const withCompliance = total - sin_datos

  const interpretation =
    total === 0
      ? { headline: 'No hay KPIs en esta vista.', sub: 'Ajusta filtros para ver indicadores.' }
      : sin_datos === total
        ? {
            headline: 'No hay cumplimiento registrado en esta vista.',
            sub: 'Registra mediciones en catálogo para evaluar el portafolio.',
          }
        : off_track > 0
          ? {
              headline: 'La operación está fuera de control.',
              sub: `${off_track} KPI${off_track === 1 ? '' : 's'} ${off_track === 1 ? 'está' : 'están'} fuera de meta.`,
            }
          : at_risk > 0
            ? {
                headline: 'La operación presenta riesgos.',
                sub: `${at_risk} KPI${at_risk === 1 ? '' : 's'} en riesgo de no alcanzar la meta.`,
              }
            : on_track > 0
              ? {
                  headline: 'La operación está alineada a la meta.',
                  sub: `${on_track} KPI${on_track === 1 ? '' : 's'} en meta en esta vista.`,
                }
              : {
                  headline: 'Desempeño mixto en esta vista.',
                  sub: 'Revisa el detalle por indicador.',
                }

  const showEvolution =
    !snapshotsLoading && !snapshotsError && chartSeries.length >= 2

  const needsUrgent =
    estado === 'critico' || estado === 'riesgo' || criticalKpiCount > 0

  const criticalPctLabel = Math.round(KPI_COMPLIANCE_CRITICAL_MAX * 100)

  return (
    <section
      data-section="portfolio-health"
      className="portfolio-health-exec scroll-mt-4 space-y-6"
      aria-labelledby="portfolio-health-exec-heading"
    >
      <div className="portfolio-health-exec__hero rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/15 px-4 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="portfolio-health-exec-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Salud del portafolio
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Vista actual · Horizonte <span className="font-medium text-foreground">{horizonLabel}</span>
          </p>

          {isLoading && o2cPct == null && pts == null ? (
            <div className="mt-8 space-y-4" aria-busy="true">
              <div className="mx-auto h-16 w-48 animate-pulse rounded-lg bg-muted/60" />
              <div className="mx-auto h-8 w-32 animate-pulse rounded-md bg-muted/50" />
              <div className="mx-auto h-6 w-24 animate-pulse rounded bg-muted/40" />
            </div>
          ) : (
            <>
              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-5xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl">
                  {o2cPct != null ? (
                    <>
                      {o2cPct}
                      <span className="text-2xl font-semibold text-muted-foreground sm:text-3xl">%</span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
                <p className="text-sm font-medium text-muted-foreground">Cumplimiento O2C</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide',
                    estadoStyle.badgeClass
                  )}
                >
                  {estadoStyle.label}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground"
                  title="Metodología documento KPIs (pesos y metas por mes de programa)"
                >
                  <span className="font-semibold text-foreground">{pts != null ? pts : '—'}</span>
                  <span>/ {MD_SPEC_MAX_COMPLIANCE_PCT} pts</span>
                  <InfoHint text="Puntos según documento KPIs: Σ (cumplimiento MD % × peso). El cumplimiento % destacado arriba es el motor O2C del tablero (0–100%). Ambos usan las mismas mediciones; las reglas de meta difieren según metodología." />
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {criticalKpiCount > 0 ? (
        <div
          data-section="critical-alert"
          className="flex gap-3 rounded-xl border border-destructive/45 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">Alerta: </span>
            {criticalKpiCount} indicador{criticalKpiCount === 1 ? '' : 'es'} con cumplimiento bajo (&lt;
            {criticalPctLabel}%) en la vista actual.
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <p className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
          {interpretation.headline}
        </p>
        <p className="text-sm text-muted-foreground">{interpretation.sub}</p>
      </div>

      <div
        className="portfolio-health-exec__distribution grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Distribución por semáforo O2C"
      >
        <SemaphoreBlock
          emoji="🔴"
          label="Fuera de meta"
          value={off_track}
          variant="bad"
          emphasized={off_track > 0}
        />
        <SemaphoreBlock
          emoji="🟡"
          label="En riesgo"
          value={at_risk}
          variant="warn"
          emphasized={at_risk > 0 && off_track === 0}
        />
        <SemaphoreBlock
          emoji="🟢"
          label="En meta"
          value={on_track}
          variant="ok"
          emphasized={off_track === 0 && at_risk === 0 && on_track > 0}
        />
        <SemaphoreBlock
          emoji="⚪"
          label="Sin datos"
          value={sin_datos}
          variant="muted"
          emphasized={sin_datos > 0 && withCompliance === 0}
        />
      </div>

      <div
        className={cn(
          'rounded-2xl border p-4 sm:p-5',
          needsUrgent
            ? 'border-amber-500/35 bg-amber-500/[0.07]'
            : 'border-border/60 bg-muted/20'
        )}
      >
        <p className="text-center text-sm font-semibold text-foreground">
          {needsUrgent ? 'La operación requiere decisión' : 'Próximos pasos'}
        </p>
        {needsUrgent ? (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Convierte el dato en acción: brechas, ejecución y mediciones.
          </p>
        ) : (
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Mantén el seguimiento en gaps, tablero y catálogo.
          </p>
        )}
        <div className="mt-4 flex flex-col flex-wrap items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <Button asChild className="gap-2 shadow-sm">
            <Link to={ROUTES.DASHBOARD_GAPS}>
              <FolderKanban className="h-4 w-4" aria-hidden />
              Ver gaps críticos
              <ArrowRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link to={ROUTES.KANBAN}>
              <Kanban className="h-4 w-4" aria-hidden />
              Ejecutar acciones
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to={`${ROUTES.DASHBOARD_KPIS}#kpi-list-title`}>
              <ClipboardList className="h-4 w-4" aria-hidden />
              Ver KPIs / mediciones
            </Link>
          </Button>
        </div>
      </div>

      {showEvolution ? (
        <div className="portfolio-health-exec__evolution min-w-0">
          <GlobalScoreHistoryChart
            series={chartSeries}
            isLoading={snapshotsLoading}
            isError={snapshotsError}
            chartRange={chartRange}
            onChartRangeChange={onChartRangeChange}
            title="Evolución del score global O2C"
            description="Historial guardado al registrar mediciones."
          />
        </div>
      ) : null}
    </section>
  )
}

function SemaphoreBlock({
  emoji,
  label,
  value,
  variant,
  emphasized,
}: {
  emoji: string
  label: string
  value: number
  variant: 'ok' | 'warn' | 'bad' | 'muted'
  emphasized?: boolean
}) {
  const cls =
    variant === 'ok'
      ? 'border-emerald-500/35 bg-emerald-500/[0.08]'
      : variant === 'warn'
        ? 'border-amber-500/35 bg-amber-500/[0.08]'
        : variant === 'bad'
          ? 'border-destructive/35 bg-destructive/[0.08]'
          : 'border-muted bg-muted/30'

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border px-3 py-3 transition-shadow sm:px-4 sm:py-4',
        cls,
        emphasized && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground sm:text-4xl">{value}</p>
    </div>
  )
}
