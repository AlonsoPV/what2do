import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { InfoHint } from '@/components/InfoHint'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'

export type KpiGapProgressRow = {
  kpiId: string
  orden: number
  kpiLabel: string
  gapId: string
  gapLabel: string
  avancePct: number | null
  estado: 'cerrado' | 'en_progreso' | 'abierto' | null
  puntosCompletados: number
  totalPuntosGap: number
}

type Props = {
  rows: KpiGapProgressRow[]
  isLoading: boolean
}

function KpiGapProgressSkeleton() {
  return (
    <div
      className="kpi-gap-progress__skeleton space-y-3"
      aria-busy="true"
      aria-label="Cargando avance de gaps vinculados"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[5.25rem] animate-pulse rounded-xl border border-border/40 bg-muted/30"
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  )
}

function ProgressRow({ row }: { row: KpiGapProgressRow }) {
  const pct =
    row.avancePct != null ? Math.min(100, Math.max(0, Math.round(row.avancePct * 100))) : null
  const barClass =
    row.estado === 'cerrado'
      ? 'bg-emerald-500'
      : row.estado === 'en_progreso'
        ? 'bg-amber-500'
        : 'bg-muted-foreground/35'

  const statusLabel =
    row.estado === 'cerrado'
      ? 'Cerrado'
      : row.estado === 'en_progreso'
        ? 'En progreso'
        : 'Abierto'

  const dotsClass =
    row.estado === 'cerrado'
      ? 'bg-emerald-500'
      : row.estado === 'en_progreso'
        ? 'bg-amber-500'
        : 'bg-muted-foreground/45'

  const puntosHint =
    row.totalPuntosGap > 0
      ? `${row.puntosCompletados} / ${row.totalPuntosGap} pts`
      : 'Gap sin story points definidos'

  return (
    <article
      className="kpi-gap-progress__row group rounded-xl border border-border/55 bg-card/40 px-3 py-3 shadow-sm transition-colors hover:border-border hover:bg-card/70 sm:px-4 sm:py-3.5"
      aria-labelledby={`kpi-gap-kpi-${row.kpiId}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-5">
        <div className="min-w-0 flex-1 space-y-1">
          <p
            id={`kpi-gap-kpi-${row.kpiId}`}
            className="text-sm font-semibold leading-snug text-foreground"
            title={row.kpiLabel}
          >
            {row.kpiLabel}
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
              Gap
            </span>
            <span aria-hidden className="text-muted-foreground/60">
              ←
            </span>
            <Link
              to={`${ROUTES.KANBAN}?gap=${encodeURIComponent(row.gapId)}`}
              className="min-w-0 truncate font-medium text-primary underline-offset-2 hover:underline"
              title={row.gapLabel}
            >
              {row.gapLabel}
            </Link>
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-xl lg:flex-none lg:basis-[min(100%,22rem)] xl:basis-[min(100%,26rem)]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div
              className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted sm:h-3.5"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct ?? 0}
              aria-valuetext={
                pct != null ? `${pct}% del avance en story points del gap` : 'Avance no disponible'
              }
              aria-label="Avance del gap en story points"
            >
              <div
                className={cn('h-full rounded-full transition-[width] duration-500 ease-out', barClass)}
                style={{ width: pct != null ? `${pct}%` : '0%' }}
              />
            </div>
            <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground sm:w-12">
              {pct != null ? `${pct}%` : '—'}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm sm:text-xs">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', dotsClass)} aria-hidden />
              {statusLabel}
            </span>
          </div>
          <p className="text-[11px] tabular-nums text-muted-foreground sm:text-xs">{puntosHint}</p>
        </div>
      </div>
    </article>
  )
}

export function KpiGapLinkedProgressSection({ rows, isLoading }: Props) {
  const summary = useMemo(() => {
    let abierto = 0
    let en_progreso = 0
    let cerrado = 0
    let sumPct = 0
    let nPct = 0
    for (const r of rows) {
      if (r.estado === 'abierto') abierto += 1
      else if (r.estado === 'en_progreso') en_progreso += 1
      else if (r.estado === 'cerrado') cerrado += 1
      if (r.avancePct != null) {
        sumPct += r.avancePct
        nPct += 1
      }
    }
    const avgPct = nPct > 0 ? Math.round((sumPct / nPct) * 100) : null
    return { total: rows.length, abierto, en_progreso, cerrado, avgPct }
  }, [rows])

  return (
    <section className="kpi-gap-progress scroll-mt-4">
      <SectionCard>
        <SectionCardHeader
          title="Avance de gaps vinculados"
          subtitle="Cada KPI se alimenta del cierre de su gap; al 100% el KPI puede alcanzar su meta."
          action={
            <InfoHint text="El porcentaje refleja story points de acciones cerradas vs el total del gap. Usa el enlace del gap para abrir el Kanban filtrado." />
          }
        />
        <SectionCardBody className="space-y-4">
          {isLoading ? (
            <KpiGapProgressSkeleton />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún KPI visible tiene gap vinculado con avance registrado.
            </p>
          ) : (
            <>
              <div
                className="kpi-gap-progress__summary grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
                aria-label="Resumen de avance de gaps"
              >
                <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Vinculados
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-foreground">{summary.total}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Abiertos
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-foreground">{summary.abierto}</div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-amber-950 dark:text-amber-100">
                  <div className="text-[10px] font-medium uppercase tracking-wide opacity-90">En progreso</div>
                  <div className="text-lg font-semibold tabular-nums">{summary.en_progreso}</div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-emerald-950 dark:text-emerald-100">
                  <div className="text-[10px] font-medium uppercase tracking-wide opacity-90">Cerrados</div>
                  <div className="text-lg font-semibold tabular-nums">{summary.cerrado}</div>
                </div>
                <div className="col-span-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-2.5 py-2 sm:col-span-1 lg:col-span-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Avance medio
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-foreground">
                    {summary.avgPct != null ? `${summary.avgPct}%` : '—'}
                  </div>
                </div>
              </div>

              <div className="kpi-gap-progress__list space-y-2.5">
                {rows.map((row) => (
                  <ProgressRow key={row.kpiId} row={row} />
                ))}
              </div>
            </>
          )}
        </SectionCardBody>
      </SectionCard>
    </section>
  )
}
