import { InfoHint } from '@/components/InfoHint'
import { cn } from '@/lib/utils'
import { MD_SPEC_MAX_COMPLIANCE_PCT } from '../utils/kpiMdSpecCalculations'
import type { MdSpecPortfolioDerived } from '../utils/kpiMdSpecCalculations'

type Props = {
  programMonthIndex: number | null
  programStartConfigured: boolean
  md: MdSpecPortfolioDerived
  className?: string
}

/**
 * Score y semáforo según docs/KPIs.md secciones 3–4 (0–120% cumplimiento, umbrales 80/50).
 * Complementa el widget O2C (cumplimiento 0–1 y umbrales por KPI).
 */
export function GlobalScoreMdSpecPanel({
  programMonthIndex,
  programStartConfigured,
  md,
  className,
}: Props) {
  const { mdGlobalScorePoints, mdSemaphoreCounts, semaphoreCountsSource } = md
  const pillsO2c = semaphoreCountsSource === 'o2c'
  const pts =
    mdGlobalScorePoints != null && Number.isFinite(mdGlobalScorePoints)
      ? Math.round(mdGlobalScorePoints * 10) / 10
      : null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm',
        className
      )}
    >
      <div className="border-b border-border/50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">
            Score global (metodología documento KPIs)
          </h3>
          <InfoHint
            text={
              pillsO2c
                ? 'Puntos: suma MD (documento) con metas según mes de programa. Pastillas: mismo semáforo O2C que las tarjetas KPI (horizonte M6/M12/M18 y umbrales por KPI). Coexiste con el score O2C 0–1 arriba.'
                : 'Cumplimiento 0–120%, semáforo documento (verde ≥80%, amarillo ≥50%, rojo &lt;50%). Meta activa según mes de programa y metas M3/M6/M12/M18. Coexiste con el score O2C 0–1 (tarjeta superior).'
            }
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {programStartConfigured ? (
            <>
              Mes de programa actual:{' '}
              <span className="font-medium text-foreground">
                {programMonthIndex ?? '—'} / 18
              </span>
            </>
          ) : (
            <>
              Sin <code className="rounded bg-muted px-1 text-xs">VITE_O2C_PROGRAM_START</code>, el score MD
              solo aplica la meta M18. En <code className="rounded bg-muted px-1 text-xs">.env</code> define{' '}
              <code className="rounded bg-muted px-1 text-xs">VITE_O2C_PROGRAM_START=YYYY-MM-DD</code> (primer
              día del <span className="font-medium text-foreground">primer mes del programa</span> O2C) para
              calcular el mes de programa 1–18 y usar metas M3, M6, M12 o M18 según la etapa.
            </>
          )}
        </p>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <details className="md-score__help group rounded-md border border-border/70 bg-muted/25 text-[10px] leading-snug text-muted-foreground">
          <summary className="md-score__help-summary cursor-pointer list-none px-2.5 py-1.5 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:underline">Cómo se interpreta este score (documento KPIs)</span>
          </summary>
          <div className="space-y-1.5 border-t border-border/60 px-2.5 pb-2 pt-1.5">
            <p>
              <span className="font-medium text-foreground/90">Puntos (pts):</span> suma ponderada del
              cumplimiento MD de cada KPI del portafolio global: Σ (cumplimiento MD % × peso). Los
              cumplimientos MD van de 0% a 120% según el documento; el techo de{' '}
              <span className="tabular-nums">{MD_SPEC_MAX_COMPLIANCE_PCT}</span> pts supone todos los KPIs al
              máximo y pesos que sumen 1.
            </p>
            <p>
              <span className="font-medium text-foreground/90">Pastillas (conteo por KPI):</span>{' '}
              {pillsO2c ? (
                <>
                  usan el <em>mismo criterio que el detalle de KPIs</em> (cumplimiento O2C 0–1 y umbrales verde
                  / amarillo del catálogo). No usan la escala MD 80/50, para que coincidan con «En meta / En
                  riesgo / Fuera de meta» de las tarjetas.
                </>
              ) : (
                <>
                  cuentan <em>cuántos KPIs</em> caen en cada banda según cumplimiento MD (≥80%, 50–79%, &lt;50%)
                  —no son promedios ni un segundo score.
                </>
              )}
            </p>
            <p>
              <span className="font-medium text-foreground/90">Mes de programa:</span> define qué meta (M3, M6,
              M12 o M18) se usa por KPI para calcular ese cumplimiento MD. Sin fecha de inicio de programa en{' '}
              <code className="rounded bg-muted px-0.5 text-[9px]">.env</code>, solo aplica M18.
            </p>
            <p>
              <span className="font-medium text-foreground/90">¿Filtro por fechas aquí?</span> Este bloque muestra
              el score con el <em>estado actual</em> del catálogo y las últimas mediciones. Un filtro por fechas
              sería útil para ver el portafolio «a corte» histórico, pero hay que definir la regla (p. ej.
              mediciones hasta esa fecha vs snapshots guardados); no está implementado en esta tarjeta. La
              evolución del score O2C en la misma pantalla sí usa ventanas temporales sobre registros ya
              guardados (7d / 30d / 90d).
            </p>
            <div className="md-score__help-interpretation mt-2 border-t border-border/50 pt-2">
              <p className="font-medium text-foreground">Interpretación</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li>
                  Puntos bajos: mucho peso en KPIs con cumplimiento MD bajo o sin datos ponderables.
                </li>
                <li>
                  {pillsO2c
                    ? 'Las pastillas están alineadas al motor O2C de las tarjetas; los puntos siguen siendo la suma MD (metas por mes de programa en el documento).'
                    : 'Este bloque es independiente del score O2C 0–1 de la tarjeta superior; usan reglas distintas (documento vs motor O2C del tablero).'}
                </li>
              </ul>
            </div>
          </div>
        </details>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {pts != null ? `${pts}` : '—'}
          </span>
          <span className="text-sm text-muted-foreground">
            / {MD_SPEC_MAX_COMPLIANCE_PCT} pts (máx. teórico si todos los KPIs alcanzan 120% y pesos suman 1)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <CountPill
            label={pillsO2c ? 'En meta (O2C)' : 'Verde (≥80% MD)'}
            value={mdSemaphoreCounts.green}
            variant="ok"
          />
          <CountPill
            label={pillsO2c ? 'En riesgo' : 'Amarillo (50–79% MD)'}
            value={mdSemaphoreCounts.yellow}
            variant="warn"
          />
          <CountPill
            label={pillsO2c ? 'Fuera de meta' : 'Rojo (&lt;50% MD)'}
            value={mdSemaphoreCounts.red}
            variant="bad"
          />
          <CountPill label="Sin datos" value={mdSemaphoreCounts.sin_datos} variant="muted" />
        </div>
      </div>
    </div>
  )
}

function CountPill({
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
      ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
      : variant === 'warn'
        ? 'border-amber-500/35 bg-amber-500/15 text-amber-900 dark:text-amber-100'
        : variant === 'bad'
          ? 'border-destructive/35 bg-destructive/15 text-destructive'
          : 'border-muted bg-muted/40 text-muted-foreground'

  return (
    <div className={cn('rounded-lg border px-2 py-1.5', cls)}>
      <div className="text-[10px] leading-tight opacity-90">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
