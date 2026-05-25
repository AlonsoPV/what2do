/**
 * Sistema de alineación estratégica — página consultiva (no dashboard de métricas sueltas).
 */

import { Fragment, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Layers,
  ShieldCheck,
  Telescope,
  Target,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAcciones } from '@/features/operations/hooks/useAcciones'
import type { AccionDiaria } from '@/types'
import {
  useGapKpiLinks,
  useGaps,
  useO2cGlobalScore,
  useStrategicNorthQuery,
  useFcesQuery,
  type GapKpiLink,
} from '@/features/kpi/hooks'
import type { Gap } from '@/features/kpi/types/kpi.types'
import type { CatalogKpiMetricComputed } from '@/features/kpi/utils/kpiCalculations'
import type { KpiComplianceStatus } from '@/features/kpi/utils/kpiCalculations'
import { isAccionEstadoDone, accionStoryPoints } from '@/features/kpi/utils/gapProgress'
import { cn } from '@/lib/utils'
import {
  O2C_CORE_PROCESSES,
  STRATEGIC_LABEL_MISION,
  STRATEGIC_LABEL_VALORES,
  STRATEGIC_LABEL_VISION,
  STRATEGIC_NORTH_FALLBACK,
  STRATEGIC_TAGLINE,
} from '@/pages/estrategia/strategicMapStaticData'
import { resolveStrategyIcon } from '@/pages/estrategia/strategyLucideIcons'
import {
  fceLayerCompletenessPct,
  gapLinksMatchingProceso,
  generateSystemReading,
  getFceHealthFromCompliance,
  parseStrategicContextValor,
  processoOperationalTone,
  processesLayerCompletenessPct,
  yearsRemainingToBhag,
  type FceComplianceHealth,
  type StrategicContextLine,
} from '@/features/strategy/utils/strategyInsights'

function ConnectorGlyph() {
  return (
    <div className="flex justify-center py-2" aria-hidden>
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-5 w-px bg-border/60" />
        <div className="size-1.5 rounded-full bg-primary/55" />
        <div className="h-5 w-px bg-border/60" />
      </div>
    </div>
  )
}

function MapLevel({
  idSuffix,
  domId,
  badge,
  badgeClassName,
  title,
  subtitle,
  accentBorderClass,
  children,
  defaultOpen = true,
}: {
  idSuffix: string
  domId?: string
  badge: string
  badgeClassName: string
  title: string
  subtitle: string
  accentBorderClass: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const controlsId = `map-level-${idSuffix}`

  return (
    <section
      id={domId}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-lg border border-border/70 border-l-4 bg-card shadow-sm',
        accentBorderClass
      )}
      aria-labelledby={`${controlsId}-label`}
    >
      <button
        id={`${controlsId}-label`}
        type="button"
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-start gap-3 px-4 py-3.5 text-left transition-colors sm:flex-nowrap sm:items-center',
          'hover:bg-muted/35'
        )}
        aria-expanded={open}
        aria-controls={controlsId}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={cn(
            'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums sm:mt-0',
            badgeClassName
          )}
        >
          {badge}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug text-foreground">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <ChevronDown
          className={cn(
            'mt-1 size-4 shrink-0 text-muted-foreground transition-transform sm:mt-0',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      <div id={controlsId} className={cn(!open && 'hidden')} role="region">
        <div className="border-t border-border/40 bg-background px-4 py-5 sm:px-5">{children}</div>
      </div>
    </section>
  )
}

function execBarTone(pct: number | null) {
  if (pct == null) return 'bg-muted'
  if (pct <= 33) return 'bg-destructive'
  if (pct <= 66) return 'bg-amber-500'
  return 'bg-emerald-600'
}

function StrategicBlockSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-busy>
      <div className="mx-auto h-5 max-w-lg rounded-md bg-muted" />
      <div className="h-28 rounded-lg bg-muted/70" />
    </div>
  )
}

function ExecMetricTile(props: {
  label: string
  value: ReactNode
  sub: string
  barPct: number | null
  barClassName: string
}) {
  const { label, value, sub, barPct, barClassName } = props
  const w = barPct != null ? Math.min(100, Math.max(0, barPct)) : 0
  return (
    <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
        <p className="text-[11px] leading-snug text-muted-foreground">{sub}</p>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full transition-all', barClassName)} style={{ width: `${w}%` }} />
        </div>
      </div>
    </div>
  )
}

function gapFceId(gap: Gap): string | null {
  return gap.fce_id ?? null
}

function fceComplianceBorderClasses(health: FceComplianceHealth): string {
  switch (health) {
    case 'on_track':
      return 'border-emerald-300 dark:border-emerald-800'
    case 'at_risk':
      return 'border-amber-300 dark:border-amber-800'
    case 'off_track':
      return 'border-destructive/40'
    default:
      return 'border-border/60'
  }
}

function fceComplianceBarClass(health: FceComplianceHealth): string {
  switch (health) {
    case 'on_track':
      return 'bg-emerald-500'
    case 'at_risk':
      return 'bg-amber-500'
    case 'off_track':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/25'
  }
}

function procesoCardClasses(tone: ReturnType<typeof processoOperationalTone>): string {
  switch (tone) {
    case 'ok':
      return 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
    case 'crit':
      return 'border-destructive/35 bg-destructive/10 text-destructive'
    default:
      return 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-50'
  }
}

function scrollToStrategyAnchor(domId: string) {
  if (typeof document === 'undefined') return
  document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const CONSULTIVE_STORYLINE = [
  {
    label: 'Estrategia',
    title: 'Promesa 2030',
    text: 'El BHAG define la apuesta: confiabilidad operativa y financiera en logistica farmaceutica.',
  },
  {
    label: 'Operación',
    title: 'Proceso con gates',
    text: 'Nadie avanza con input incompleto; el sistema bloquea, evidencia y libera el siguiente paso.',
  },
  {
    label: 'Dinero',
    title: 'Viaje convertido en caja',
    text: 'La evidencia T+0 libera facturacion, reduce retrabajo y protege margen por viaje.',
  },
] as const

const OPERATING_GATES = [
  {
    icon: ClipboardCheck,
    label: 'Input completo',
    text: 'Solicitud, capacidad, ruta, unidad y operador validados antes de ejecutar.',
  },
  {
    icon: ShieldCheck,
    label: 'Evidencia digital',
    text: 'POD, fotos, temperatura y firma quedan trazables; sin evidencia no hay liberacion.',
  },
  {
    icon: CircleDollarSign,
    label: 'Caja sin friccion',
    text: 'Facturacion automatica, cobranza visible y margen medido desde el flujo O2C.',
  },
] as const

const PROCESS_OPERATING_MODEL = [
  {
    label: 'Calificar y aceptar cliente',
    objective: 'Aceptar solo servicios rentables y ejecutables.',
    gate: 'Viable: capacidad, rentabilidad y riesgo regulatorio.',
    kpis: ['Margen esperado vs real', 'Churn operativo'],
  },
  {
    label: 'Planear y asignar viaje',
    objective: 'Salir bien desde el inicio.',
    gate: 'Solicitud validada, unidad, operador, ruta y ventana completos.',
    kpis: ['Viajes sin reasignacion', 'Salidas a tiempo'],
  },
  {
    label: 'Validar flota y operador',
    objective: 'No sacar unidades ni personas no aptas.',
    gate: 'Checklist digital en verde y certificaciones vigentes.',
    kpis: ['Flota en verde', 'MTBF / MTTR', 'Incidentes SST'],
  },
  {
    label: 'Ejecutar viaje monitoreado',
    objective: 'Controlar en tiempo real, no corregir despues.',
    gate: 'Monitoreo activo de tiempo, temperatura e incidencias.',
    kpis: ['Viajes monitoreados', 'OTIF', 'Incidencias en ruta'],
  },
  {
    label: 'Capturar evidencia en sitio',
    objective: 'Cerrar el viaje en sitio.',
    gate: 'POD, fotos, temperatura y firma completos T+0.',
    kpis: ['Evidencias T+0', 'Evidencias rechazadas', 'Retrabajo'],
  },
  {
    label: 'Facturar automaticamente',
    objective: 'Convertir viaje aprobado en factura sin espera.',
    gate: 'Evidencia completa libera facturacion y envio inmediato.',
    kpis: ['Facturacion automatica', 'DSO'],
  },
  {
    label: 'Cobrar y medir margen',
    objective: 'Proteger flujo de caja y rentabilidad por viaje.',
    gate: 'Cobranza visible, pago registrado y margen conciliado.',
    kpis: ['Flujo de caja', 'Margen por viaje'],
  },
  {
    label: 'Gobernar con datos',
    objective: 'Decidir antes de que duela.',
    gate: 'Alertas, dashboards y decisiones semanales con trazabilidad.',
    kpis: ['Alertas atendidas', 'Cumplimiento OKRs', 'Decisiones con datos'],
  },
] as const

function StrategyStoryline() {
  return (
    <section className="mb-6 rounded-lg border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
        {CONSULTIVE_STORYLINE.map((item, idx) => (
          <Fragment key={item.label}>
            <article className="rounded-lg border border-border/55 bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{item.label}</p>
              <h2 className="mt-1 text-sm font-semibold leading-snug text-foreground">{item.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </article>
            {idx < CONSULTIVE_STORYLINE.length - 1 ? (
              <div className="hidden items-center justify-center px-1 lg:flex" aria-hidden>
                <ArrowRight className="size-5 text-muted-foreground/55" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {OPERATING_GATES.map((gate) => {
          const Icon = gate.icon
          return (
            <div key={gate.label} className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{gate.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gate.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function topPendingAccionesForGaps(acciones: AccionDiaria[], gapIds: Set<string>): AccionDiaria[] {
  return acciones
    .filter((a) => a.gap_id != null && gapIds.has(a.gap_id) && !isAccionEstadoDone(a.estado))
    .sort((a, b) => accionStoryPoints(b) - accionStoryPoints(a))
    .slice(0, 3)
}

/** Interpreta `strategic_north.valores` como narrativa + pilares del BHAG. */
function StrategicContextSection({ valores }: { valores: string }) {
  const lines = useMemo(() => parseStrategicContextValor(valores), [valores])
  const narratives = lines.filter((l): l is Extract<StrategicContextLine, { kind: 'narrative' }> => l.kind === 'narrative')
  const pillars = lines
    .filter((l): l is Extract<StrategicContextLine, { kind: 'pillar' }> => l.kind === 'pillar')
    .slice()
    .sort((a, b) => a.index - b.index)

  if (lines.length === 0) return null

  return (
    <div className="mt-8 rounded-lg border border-border/55 bg-muted/15 px-4 py-5 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm dark:shadow-none"
            style={{ background: '#EEEDFE', color: '#3C3489' }}
          >
            <Layers className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {STRATEGIC_LABEL_VALORES}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
              El vínculo entre propósito, ventaja competitiva y los tres vectores que definen el BHAG — antes de bajar a FCE y KPIs.
            </p>
          </div>
        </div>
      </div>

      {narratives.length > 0 ? (
        <div className={cn('mt-5 grid gap-3', narratives.length > 1 && 'sm:grid-cols-2')}>
          {narratives.map((n, i) => (
            <div
              key={`ctx-n-${i}`}
              className="rounded-lg border border-border/45 bg-background/80 px-4 py-3 shadow-sm"
            >
              <p className="m-0 border-l-[3px] border-primary/40 pl-4 text-sm leading-relaxed text-foreground">{n.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      {pillars.length > 0 ? (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pilares del BHAG</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pillars.map((p) => (
              <article
                key={`pillar-${p.index}`}
                className="rounded-lg border border-violet-200/90 bg-[#EEEDFE]/30 px-4 py-3 dark:border-violet-900/55 dark:bg-violet-950/30"
              >
                <span
                  className="inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#3C3489]"
                  style={{ background: '#EEEDFE' }}
                >
                  Pilar {p.index}
                </span>
                <p className="mt-2 text-sm leading-snug text-foreground">{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Nivel 1 — BHAG + misión/visión; colapsado por defecto para lectura ejecutiva */
function NorthBHAGCollapsible(props: {
  north: typeof STRATEGIC_NORTH_FALLBACK
  strategicLoading: boolean
  bhagYearsLeft: number
  scoreFrac: number | null
}) {
  const { north, strategicLoading, bhagYearsLeft, scoreFrac } = props
  const [open, setOpen] = useState(true)

  const scorePctRounded = scoreFrac != null && Number.isFinite(scoreFrac) ? Math.round(scoreFrac * 100) : null
  const listoPctColor =
    scoreFrac == null || !Number.isFinite(scoreFrac)
      ? 'text-muted-foreground'
      : scoreFrac < 0.3
        ? 'text-destructive'
        : scoreFrac < 0.65
          ? 'text-amber-600 dark:text-amber-500'
          : 'text-emerald-600 dark:text-emerald-500'

  return (
    <section
      id="strategy-level-norte"
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border/70 border-l-4 border-l-violet-500 bg-card shadow-sm"
    >
      <button
        type="button"
        className={cn(
          'flex w-full flex-col gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between sm:gap-4'
        )}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <span
            className="inline-flex w-fit shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#3C3489]"
            style={{ background: '#EEEDFE' }}
          >
            Nivel 1
          </span>
          <p className="min-w-0 text-sm font-medium leading-snug text-foreground">
            <span className="line-clamp-2 md:line-clamp-1">
              {strategicLoading ? (
                <span className="inline-block h-4 w-[min(100%,420px)] max-w-full animate-pulse rounded bg-muted" />
              ) : (
                north.bhag
              )}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 whitespace-nowrap text-xs text-muted-foreground sm:justify-end">
          <span>
            {strategicLoading ? '—' : `${bhagYearsLeft} año${bhagYearsLeft === 1 ? '' : 's'} al BHAG`}
          </span>
          <span className="text-border">·</span>
          <span className={cn('font-semibold tabular-nums', listoPctColor)}>
            {scorePctRounded != null ? `${scorePctRounded}% del sistema listo` : '— sistema sin score'}
          </span>
          <ChevronDown
            className={cn('ml-2 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-border/40 bg-background px-4 py-6 sm:px-5">
          {strategicLoading ? (
            <StrategicBlockSkeleton />
          ) : (
            <>
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                BHAG {north.bhag_anio}
              </p>
              <p className="mx-auto mt-3 max-w-4xl text-pretty text-center text-lg font-semibold leading-snug text-foreground">
                {north.bhag}
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-pretty text-center text-sm text-muted-foreground">{STRATEGIC_TAGLINE}</p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border/55 bg-muted/10 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Target className="size-4 text-primary" aria-hidden />
                    {STRATEGIC_LABEL_MISION}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{north.mision}</p>
                </div>
                <div className="rounded-lg border border-border/55 bg-muted/10 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Telescope className="size-4 text-primary" aria-hidden />
                    {STRATEGIC_LABEL_VISION}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{north.vision}</p>
                </div>
              </div>

              {north.valores ? <StrategicContextSection valores={north.valores} /> : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}

export function StrategyPage() {
  const [selectedFceId, setSelectedFceId] = useState<string | null>(null)

  const northQuery = useStrategicNorthQuery()
  const fcesQuery = useFcesQuery()
  const gapsQuery = useGaps({ filters: { activo: true } })

  const { globalScore, portfolioBreakdown, coverage, portfolioMetricItems, isLoading: o2cLoading } =
    useO2cGlobalScore()
  const { links, isLoading: linksLoading } = useGapKpiLinks()
  const { data: acciones = [], isLoading: accionesLoading } = useAcciones({})

  const north = northQuery.data ?? STRATEGIC_NORTH_FALLBACK
  const usedFallbackNorth = northQuery.isSuccess && northQuery.data == null
  const fces = useMemo(() => fcesQuery.data ?? [], [fcesQuery.data])
  const gaps = useMemo(() => gapsQuery.data ?? [], [gapsQuery.data])

  const strategicErr =
    northQuery.isError || fcesQuery.isError
      ? ((northQuery.error ?? fcesQuery.error) as Error)?.message ?? 'No se pudieron cargar datos estratégicos.'
      : null

  const strategicLoading = northQuery.isLoading || fcesQuery.isLoading

  const scorePct = globalScore != null && Number.isFinite(globalScore) ? Math.round(globalScore * 1000) / 10 : null
  const scorePctHeader = globalScore != null && Number.isFinite(globalScore) ? Math.round(globalScore * 100) : null

  const kpiTotals = useMemo(() => {
    const { on_track, at_risk, off_track, sin_datos } = portfolioBreakdown
    const sum = on_track + at_risk + off_track + sin_datos
    return {
      sum,
      on_track,
      at_risk,
      off_track_plus_sin: off_track + sin_datos,
    }
  }, [portfolioBreakdown])

  const gapExecution = useMemo(() => {
    const cerrados = links.filter((l) => l.estado === 'cerrado').length
    const ptsTotal = links.reduce((s, l) => s + l.totalPuntosGap, 0)
    const ptsDone = links.reduce((s, l) => s + l.puntosCompletados, 0)
    return {
      cerrados,
      gapsTotal: links.length,
      ptsTotal,
      ptsDone,
      ptsPct: ptsTotal > 0 ? Math.round((ptsDone / ptsTotal) * 1000) / 10 : null,
    }
  }, [links])

  const accionStats = useMemo(() => {
    const total = acciones.length
    const done = acciones.filter((a) => isAccionEstadoDone(a.estado)).length
    return {
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 1000) / 10 : null,
    }
  }, [acciones])

  const kpisByFceOrdered = useMemo(() => {
    return fces.map((fce) => {
      const gapIdsForFce = new Set(gaps.filter((g) => gapFceId(g) === fce.id).map((g) => g.id))
      return portfolioMetricItems.filter((m) => m.row.gap_id != null && gapIdsForFce.has(m.row.gap_id))
    })
  }, [fces, gaps, portfolioMetricItems])

  const fceNavPct = useMemo(() => {
    return fceLayerCompletenessPct(kpisByFceOrdered)
  }, [kpisByFceOrdered])

  const procesoTonesForNav = useMemo(() => {
    return O2C_CORE_PROCESSES.map((_, i) =>
      processoOperationalTone(
        gapLinksMatchingProceso(links, i).filter((g) => g.estado !== 'cerrado')
      )
    )
  }, [links])

  const procesosPct = useMemo(() => processesLayerCompletenessPct(procesoTonesForNav), [procesoTonesForNav])

  const kpiPctForNav =
    kpiTotals.sum > 0 ? Math.round((portfolioBreakdown.on_track / kpiTotals.sum) * 1000) / 10 : 0

  const gapPctForNav =
    gapExecution.gapsTotal > 0
      ? Math.round((gapExecution.cerrados / gapExecution.gapsTotal) * 1000) / 10
      : 0

  const accPctForNav = accionStats.pct != null ? Math.round(accionStats.pct * 10) / 10 : 0

  const resultadoPct = scoreFracToPct(globalScore)

  const navRows = useMemo(
    () => [
      { label: 'Norte', pct: 100, anchor: 'strategy-level-norte' },
      { label: 'FCE', pct: fceNavPct, anchor: 'strategy-level-fce' },
      { label: 'Procesos', pct: procesosPct, anchor: 'strategy-level-procesos' },
      { label: 'KPIs', pct: kpiPctForNav, anchor: 'strategy-level-ejecución' },
      { label: 'Gaps', pct: gapPctForNav, anchor: 'strategy-level-ejecución' },
      { label: 'Acciones', pct: accPctForNav, anchor: 'strategy-level-ejecución' },
      { label: 'Resultado', pct: resultadoPct, anchor: 'strategy-level-ejecución' },
    ],
    [fceNavPct, procesosPct, kpiPctForNav, gapPctForNav, accPctForNav, resultadoPct]
  )

  const executiveSignals = useMemo(
    () => [
      { label: 'FCE', value: fces.length, sub: 'pilares críticos', pct: fceNavPct },
      {
        label: 'Gaps',
        value: `${gapExecution.cerrados}/${gapExecution.gapsTotal}`,
        sub: 'brechas cerradas',
        pct: gapPctForNav,
      },
      {
        label: 'Acciones',
        value: `${accionStats.done}/${accionStats.total}`,
        sub: 'completadas',
        pct: accionStats.pct,
      },
    ],
    [fces.length, fceNavPct, gapExecution, gapPctForNav, accionStats]
  )

  const fceCounts = useMemo(() => {
    const map = new Map<string, { gapCount: number; kpiCount: number; accionesActivas: number }>()
    for (const f of fces) map.set(f.id, { gapCount: 0, kpiCount: 0, accionesActivas: 0 })
    for (const g of gaps) {
      const fid = gapFceId(g)
      if (!fid || !map.has(fid)) continue
      map.get(fid)!.gapCount += 1
    }
    for (const m of portfolioMetricItems) {
      const gid = m.row.gap_id
      if (!gid) continue
      const gap = gaps.find((x) => x.id === gid)
      const fid = gap ? gapFceId(gap) : null
      if (!fid || !map.has(fid)) continue
      map.get(fid)!.kpiCount += 1
    }
    const gidToFce = new Map<string, string>()
    for (const g of gaps) {
      const fid = gapFceId(g)
      if (fid) gidToFce.set(g.id, fid)
    }
    for (const a of acciones) {
      const gid = a.gap_id
      if (!gid) continue
      const fid = gidToFce.get(gid)
      if (!fid || !map.has(fid)) continue
      if (!isAccionEstadoDone(a.estado)) map.get(fid)!.accionesActivas += 1
    }
    return map
  }, [fces, gaps, portfolioMetricItems, acciones])

  const selectedFce = selectedFceId ? fces.find((f) => f.id === selectedFceId) ?? null : null

  const selectedGaps = useMemo(() => {
    if (!selectedFceId) return []
    return gaps.filter((g) => gapFceId(g) === selectedFceId).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [gaps, selectedFceId])

  const selectedGapIdSet = useMemo(() => new Set(selectedGaps.map((g) => g.id)), [selectedGaps])

  const selectedKpis = useMemo(() => {
    if (!selectedFceId) return []
    return portfolioMetricItems.filter((m) => m.row.gap_id != null && selectedGapIdSet.has(m.row.gap_id))
  }, [portfolioMetricItems, selectedGapIdSet, selectedFceId])

  const fceGapLinks = useMemo((): GapKpiLink[] => {
    return links.filter((l) => selectedGapIdSet.has(l.gapId)).sort((a, b) => a.gapNombre.localeCompare(b.gapNombre))
  }, [links, selectedGapIdSet])

  const topImpactAcciones = useMemo(
    () => topPendingAccionesForGaps(acciones, selectedGapIdSet),
    [acciones, selectedGapIdSet]
  )

  const execLoading = o2cLoading || linksLoading || accionesLoading

  const lecturaConsultiva = useMemo(
    () =>
      generateSystemReading(
        globalScore ?? null,
        portfolioBreakdown.on_track,
        kpiTotals.sum,
        gapExecution.cerrados,
        gapExecution.gapsTotal,
        accionStats.done,
        accionStats.total
      ),
    [globalScore, portfolioBreakdown.on_track, kpiTotals.sum, gapExecution, accionStats]
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-16 pt-6">
      <div className="mx-auto max-w-6xl px-4">
        <p className="sr-only">Sistema de alineación estratégica en cascada</p>

        <header className="mb-6 border-b border-border/70 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Operating System · Ejecución estratégica
          </p>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                Sistema de alineación estratégica
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Conecta el BHAG con la ejecución diaria — explora por nivel o elige un FCE para ver la cadena completa.
              </p>
              {usedFallbackNorth ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  Texto norte local hasta que exista una fila en `strategic_north` en Supabase.
                </p>
              ) : null}
            </div>
            <div
              className="grid min-w-0 gap-2 sm:grid-cols-4 lg:min-w-[520px]"
              aria-live="polite"
            >
              <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score global</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                {execLoading ? <span className="inline-block size-10 animate-pulse rounded bg-muted" /> : scorePctHeader ?? '—'}
                {scorePctHeader != null ? <span className="text-lg text-muted-foreground">%</span> : null}
              </p>
              <p className="text-[11px] text-muted-foreground">Meta: 100%</p>
              </div>
              {executiveSignals.map((signal) => (
                <div key={signal.label} className="rounded-lg border border-border/60 bg-card px-3 py-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{signal.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{signal.value}</p>
                  <p className="text-[11px] text-muted-foreground">{signal.sub}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', execBarTone(signal.pct ?? null))}
                      style={{ width: `${Math.min(100, Math.max(0, signal.pct ?? 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {strategicErr ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {strategicErr}
          </div>
        ) : null}

        <StrategyStoryline />

        <nav
          className="mb-6 grid gap-2 sm:grid-cols-4 lg:grid-cols-7"
          aria-label="Progreso por nivel de la cascada estratégica"
        >
          {navRows.map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              onClick={() => scrollToStrategyAnchor(item.anchor)}
              className="flex min-w-0 flex-col gap-1 rounded-lg border border-border/60 bg-card px-3 py-2 text-left transition-colors hover:bg-muted/45"
            >
              <span className="text-xs font-medium leading-tight text-foreground">{item.label}</span>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, item.pct))}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {Number.isFinite(item.pct) ? `${Math.round(item.pct)}%` : '—'}
              </span>
            </button>
          ))}
        </nav>

        <div>
          <NorthBHAGCollapsible
            north={north}
            strategicLoading={strategicLoading}
            bhagYearsLeft={yearsRemainingToBhag(north.bhag_anio)}
            scoreFrac={globalScore}
          />

          <ConnectorGlyph />

          <MapLevel
            idSuffix="l2"
            domId="strategy-level-fce"
            badge="Nivel 2"
            badgeClassName="bg-emerald-100 text-emerald-900 dark:bg-emerald-950/55 dark:text-emerald-50"
            title="¿Qué pilar necesita foco?"
            subtitle={
              fces.length > 0
                ? `${fces.length} FCE · salud desde cumplimiento KPI del portafolio`
                : 'Sin filas `fce` en BD · ejecuta la migración estratégica'
            }
            accentBorderClass="border-l-emerald-600"
            defaultOpen
          >
            {strategicLoading ? (
              <StrategicBlockSkeleton />
            ) : fces.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Ejecuta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">20260513190000_strategic_north_fce_gaps.sql</code>{' '}
                y recarga.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {fces.map((fce, fi) => {
                    const Icon = resolveStrategyIcon(fce.icono)
                    const active = selectedFceId === fce.id
                    const rollup = fceCounts.get(fce.id)
                    const gc = gapsQuery.isLoading ? null : rollup?.gapCount ?? 0
                    const kc = gapsQuery.isLoading || o2cLoading ? null : rollup?.kpiCount ?? 0
                    const ac = gapsQuery.isLoading || accionesLoading ? null : rollup?.accionesActivas ?? 0
                    const kpiSlice = kpisByFceOrdered[fi] ?? []
                    const { health, avgCompliance } = getFceHealthFromCompliance(kpiSlice)
                    const barW = avgCompliance != null ? Math.round(avgCompliance * 100) : 0

                    return (
                      <button
                        key={fce.id}
                        type="button"
                        onClick={() => setSelectedFceId((cur) => (cur === fce.id ? null : fce.id))}
                        className={cn(
                          'flex min-h-[132px] flex-col rounded-lg border bg-background p-4 text-left transition-all hover:border-primary/45 hover:bg-muted/20',
                          fceComplianceBorderClasses(health),
                          active && 'ring-2 ring-primary/25'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground">{fce.codigo}</p>
                            <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">{fce.nombre}</p>
                          </div>
                          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span
                            className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', {
                              'bg-emerald-500': health === 'on_track',
                              'bg-amber-500': health === 'at_risk',
                              'bg-destructive': health === 'off_track',
                              'bg-muted-foreground/30': health === 'sin_datos',
                            })}
                            aria-hidden
                          />
                        </div>
                        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full transition-all', fceComplianceBarClass(health))}
                            style={{ width: `${avgCompliance != null ? barW : 0}%` }}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                          <span>
                            {kc == null ? <span className="inline-block h-3 w-8 animate-pulse rounded bg-muted" /> : `${kc} KPI`}
                            {kc !== 1 ? 's' : ''}
                          </span>
                          <span>
                            {gc == null ? <span className="inline-block h-3 w-12 animate-pulse rounded bg-muted" /> : `${gc} gap`}
                            {gc !== 1 ? 's' : ''}
                          </span>
                          <span>
                            {ac == null ? (
                              <span className="inline-block h-3 w-14 animate-pulse rounded bg-muted" />
                            ) : (
                              `${ac} acción${ac === 1 ? '' : 'es'}`
                            )}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedFce ? (
                  <div className="mt-6 rounded-lg border border-border/60 bg-muted/15 p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {selectedFce.codigo} — cadena de valor
                        </p>
                        <h3 className="mt-1 text-base font-semibold">{selectedFce.nombre}</h3>
                        {selectedFce.descripcion ? (
                          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{selectedFce.descripcion}</p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Cerrar selección de FCE"
                        onClick={() => setSelectedFceId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          KPIs
                        </p>
                        {selectedKpis.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin KPIs en este FCE dentro del portafolio global.</p>
                        ) : (
                          selectedKpis.map((kpi) => (
                            <LevelKpiDetailRow key={kpi.row.id} kpi={kpi} />
                          ))
                        )}
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Gaps
                        </p>
                        {fceGapLinks.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin gaps enlazados a este FCE.</p>
                        ) : (
                          fceGapLinks.map((lnk) => <LevelGapDetailRow key={lnk.gapId} link={lnk} />)
                        )}
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Mayor impacto pendiente
                        </p>
                        {topImpactAcciones.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin acciones abiertas hacia estos gaps.</p>
                        ) : (
                          topImpactAcciones.map((acc) => {
                            const sp = accionStoryPoints(acc)
                            return (
                              <div key={acc.id} className="border-b border-border/40 py-2 last:border-0">
                                <p className="text-sm leading-snug line-clamp-2">{acc.titulo_accion}</p>
                                <p className="mt-0.5 text-[11px] font-medium tabular-nums text-primary">
                                  Prioridad backlog: <span className="text-foreground">{sp}</span> SP
                                </p>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Pulsa un FCE para revelar KPI → Gap → Acción en esta misma pantalla.
                  </p>
                )}
              </>
            )}
          </MapLevel>

          <ConnectorGlyph />

          <MapLevel
            idSuffix="l3"
            domId="strategy-level-procesos"
            badge="Nivel 3"
            badgeClassName="bg-amber-100 text-amber-950 dark:bg-amber-950/45 dark:text-amber-50"
            title="¿Dónde se rompe el flujo O2C?"
            subtitle="Cada proceso con señal de gaps activos (heurística de nombres GAP‑MD)."
            accentBorderClass="border-l-amber-500"
            defaultOpen={false}
          >
            <div className="mb-4 rounded-lg border border-amber-200/70 bg-amber-50/55 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-50">
              <span className="font-semibold">Principio operativo:</span> nadie avanza con input incompleto; el sistema manda, todo deja evidencia digital y sin evidencia no hay dinero.
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {PROCESS_OPERATING_MODEL.map((process, idx) => {
                const active = gapLinksMatchingProceso(links, idx).filter((x) => x.estado !== 'cerrado')
                const tone = processoOperationalTone(active)
                const nGap = active.length
                return (
                  <article
                    key={process.label}
                    className={cn(
                      'flex min-h-[245px] flex-col rounded-lg border px-4 py-3 shadow-sm',
                      procesoCardClasses(tone)
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded bg-background/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums">
                        P{idx + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium opacity-85">
                        <CheckCircle2 className="size-3" aria-hidden />
                        {nGap === 0 ? 'Sin gaps abiertos' : `${nGap} gap abierto${nGap === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold leading-snug">{process.label}</h3>
                    <p className="mt-2 text-xs leading-relaxed opacity-90">{process.objective}</p>
                    <div className="mt-3 border-t border-current/15 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Gate operativo</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-90">{process.gate}</p>
                    </div>
                    <div className="mt-auto pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">KPIs de control</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {process.kpis.map((kpi) => (
                          <span key={kpi} className="rounded bg-background/60 px-2 py-0.5 text-[10px] font-medium">
                            {kpi}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </MapLevel>

          <ConnectorGlyph />

          <MapLevel
            idSuffix="l4"
            domId="strategy-level-ejecución"
            badge="Nivel 4"
            badgeClassName="bg-red-50 text-red-900 dark:bg-red-950/45 dark:text-red-100"
            title="¿Cómo vamos?"
            subtitle="KPI mide · Gap detecta · Acción corrige · Score resume — misma fuente que el tablero"
            accentBorderClass="border-l-red-500"
            defaultOpen={false}
          >
            {execLoading ? (
              <p className="text-sm text-muted-foreground">Sincronizando…</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ExecMetricTile
                    label="Score resume resultado"
                    value={
                      scorePct != null ? (
                        <>
                          {scorePct}
                          <span className="text-sm font-normal text-muted-foreground">%</span>
                        </>
                      ) : (
                        '—'
                      )
                    }
                    sub="Coherencia del portafolio global O2C."
                    barPct={scorePct}
                    barClassName={execBarTone(scorePct)}
                  />
                  <ExecMetricTile
                    label="KPI mide"
                    value={
                      <>
                        {portfolioBreakdown.on_track}/{kpiTotals.sum}
                      </>
                    }
                    sub={`Semáforo portafolio · ${portfolioBreakdown.at_risk} en riesgo`}
                    barPct={kpiTotals.sum > 0 ? (portfolioBreakdown.on_track / kpiTotals.sum) * 100 : null}
                    barClassName="bg-emerald-600"
                  />
                  <ExecMetricTile
                    label="Gap detecta"
                    value={
                      <>
                        {gapExecution.cerrados}/{gapExecution.gapsTotal}
                      </>
                    }
                    sub={`Pts ${gapExecution.ptsDone}/${gapExecution.ptsTotal}`}
                    barPct={gapExecution.ptsPct}
                    barClassName={execBarTone(gapExecution.ptsPct)}
                  />
                  <ExecMetricTile
                    label="Acción corrige"
                    value={
                      <>
                        {accionStats.done}/{accionStats.total}
                      </>
                    }
                    sub="Acciones cargadas vs completadas."
                    barPct={accionStats.pct}
                    barClassName="bg-teal-600"
                  />
                </div>

                <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Lectura del sistema
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">{lecturaConsultiva}</p>
                </div>

                {coverage.totalKpiCount > 0 && coverage.eligibleKpiCount < coverage.totalKpiCount ? (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Cobertura de datos: KPIs elegibles {coverage.eligibleKpiCount}/{coverage.totalKpiCount}.
                  </p>
                ) : null}
              </>
            )}
          </MapLevel>
        </div>
      </div>
    </div>
  )
}

function scoreFracToPct(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 0
  return Math.round(score * 100)
}

function kpiComplianceColor(status: KpiComplianceStatus | null, noData: boolean) {
  if (noData) return 'text-muted-foreground'
  if (status === 'on_track') return 'text-emerald-600'
  if (status === 'at_risk') return 'text-amber-600'
  if (status === 'off_track') return 'text-destructive'
  return 'text-muted-foreground'
}

function LevelKpiDetailRow({ kpi }: { kpi: CatalogKpiMetricComputed }) {
  const c = kpi.compliance
  const label = kpiComplianceColor(kpi.status, c == null)
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/35 py-2 last:border-b-0">
      <span className="truncate text-sm text-foreground">{kpi.row.nombre}</span>
      <span className={cn('shrink-0 text-xs font-medium tabular-nums', label)}>
        {c != null ? `${Math.round(c * 100)}%` : '—'}
      </span>
    </div>
  )
}

function LevelGapDetailRow({ link }: { link: GapKpiLink }) {
  const pct = Math.round(link.avancePct * 100)
  const barCls =
    link.estado === 'cerrado'
      ? 'bg-emerald-500'
      : link.estado === 'en_progreso'
        ? 'bg-amber-500'
        : 'bg-muted-foreground/30'
  return (
    <div key={link.gapId} className="border-b border-border/35 py-2 last:border-b-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm">{link.gapNombre}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', barCls)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
