import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList, FileText, Info, Target, TrendingUp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { KpiSparkline } from './KpiSparkline'
import type { CatalogKpiO2cRow } from '../types/kpi.types'
import {
  type KpiComplianceStatus,
  type KpiMetric,
  resolveEffectiveCalcType,
  resolveEffectiveStatusThresholds,
} from '../utils/kpiCalculations'
import { buildKpiExecutiveInterpretation } from '../utils/kpiExecutiveInterpretation'

export type KpiCardViewModel = {
  row: CatalogKpiO2cRow
  gapLabel: string | null
  ownerLabel: string | null
  compliancePct: number | null
  status: KpiComplianceStatus | null
  weight: number | null
  trendDelta: number | null
  prevCompliancePct: number | null
  noData: boolean
  orphanGap?: boolean
  metaLine?: string | null
  currentValue: number | null
  targetValue: number | null
  unit: string | null
  sparklineValues?: number[]
  literalMetaCumplida: boolean | null
  /** Ej. KPI-03 — desde `orden` del catálogo. */
  kpiShortCode?: string | null
  /** Brechas no cerradas vinculadas a este KPI (conteo motor tablero). */
  activeBrechasCount?: number | null
  /** Etiqueta corta de horizonte de meta (M6/M12/M18). */
  targetHorizonShort?: string | null
}

type KpiCardProps = {
  vm: KpiCardViewModel
  onRegisterMeasurement?: () => void
  className?: string
}

function statusExecutiveLabel(status: KpiComplianceStatus | null, noData: boolean): string {
  if (noData) return 'Sin datos'
  if (status === 'on_track') return 'En meta'
  if (status === 'at_risk') return 'En riesgo'
  if (status === 'off_track') return 'Fuera de meta'
  return '—'
}

function statusDotClass(status: KpiComplianceStatus | null, noData: boolean): string {
  if (noData) return 'bg-muted-foreground/40'
  if (status === 'on_track') return 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
  if (status === 'at_risk') return 'bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]'
  return 'bg-destructive shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
}

function formatValueWithUnit(value: number | null, unit: string | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value}${unit ? ` ${unit}` : ''}`
}

function catalogRowToMetric(row: CatalogKpiO2cRow, current: number | null): KpiMetric {
  return {
    id: row.id,
    baseline: row.baseline,
    target_m3: row.target_m3,
    target_m6: row.target_m6,
    target_m12: row.target_m12,
    target_m18: row.target_m18,
    calc_type: row.calc_type,
    direction: row.direction,
    weight: row.weight,
    current,
    threshold_green: row.threshold_green,
    threshold_yellow: row.threshold_yellow,
  }
}

function formatNum(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(digits)
}

function calcModeLabel(
  mode: ReturnType<typeof resolveEffectiveCalcType>
): { title: string; explain: string; advanceExplain: string } {
  switch (mode) {
    case 'maximize':
      return {
        title: 'Indicador a maximizar',
        explain:
          'Se espera subir el valor medido desde la línea base hacia la meta. Mejor desempeño = valores más altos al acercarse o superar la meta.',
        advanceExplain:
          'El % de avance es el progreso en el tramo entre línea base y meta (no es el valor bruto de la medición).',
      }
    case 'minimize':
      return {
        title: 'Indicador a minimizar',
        explain:
          'Se espera bajar el valor medido desde la línea base hacia la meta. Mejor desempeño = valores más bajos al acercarse o cumplir la meta.',
        advanceExplain:
          'El % de avance mide cuánto te acercas de la base a la meta en sentido «menor es mejor».',
      }
    case 'binary':
      return {
        title: 'Indicador binario',
        explain:
          'El cumplimiento es pleno solo cuando el valor actual coincide con la meta configurada; si no, el avance queda en 0%.',
        advanceExplain: 'No hay tramo intermedio: cumple o no cumple respecto a la meta numérica.',
      }
    default:
      return {
        title: 'Tipo de indicador',
        explain: 'Revisa en catálogo el tipo de cálculo (maximizar, minimizar o binario) y la meta del horizonte activo.',
        advanceExplain: 'El avance se deriva de línea base, meta y valor actual según las reglas del KPI.',
      }
  }
}

function KpiOperationalStatusInterpretation({
  kpiNombre,
  calcMode,
  status,
  noData,
  currentValue,
  targetValue,
  baseline,
  unit,
  literalMetaCumplida,
  barPct,
}: {
  kpiNombre: string
  calcMode: ReturnType<typeof resolveEffectiveCalcType>
  status: KpiComplianceStatus | null
  noData: boolean
  currentValue: number | null
  targetValue: number | null
  baseline: number | null
  unit: string | null
  literalMetaCumplida: boolean | null
  barPct: number
}): ReactNode {
  const u = unit ? ` ${unit}` : ''
  const cur = currentValue != null && Number.isFinite(currentValue) ? formatNum(currentValue) : null
  const tgt = targetValue != null && Number.isFinite(targetValue) ? formatNum(targetValue) : null
  const base = baseline != null && Number.isFinite(baseline) ? formatNum(baseline) : null
  const badge = statusExecutiveLabel(status, noData)

  if (noData) {
    return (
      <p className="leading-snug text-muted-foreground">
        Sin medición reciente no hay lectura operativa: no sabes si el valor de este indicador está por encima o por
        debajo de la meta hasta registrar el dato.
      </p>
    )
  }

  if (calcMode === 'binary') {
    return (
      <div className="space-y-2 leading-snug">
        <p>
          El estado <strong className="text-foreground">{badge}</strong> en «{kpiNombre}» indica si el valor medido{' '}
          <strong className="text-foreground">coincide o no</strong> con la meta numérica
          {tgt != null ? (
            <>
              {' '}
              (<span className="tabular-nums">{tgt}</span>
              {u})
            </>
          ) : null}
          .
          {cur != null ? (
            <>
              {' '}
              Ahora el valor es <span className="tabular-nums font-medium text-foreground">{cur}</span>
              {u}.
            </>
          ) : null}
        </p>
        <p className="text-muted-foreground">
          En modo binario el avance solo es 0% o 100%: o alcanzas esa meta en valor o no; no hay tramo intermedio.
        </p>
      </div>
    )
  }

  if (calcMode === 'minimize') {
    return (
      <div className="space-y-2 leading-snug">
        <p>
          En indicadores donde <strong className="text-foreground">menor es mejor</strong>, el valor de{' '}
          <strong className="text-foreground">Actual</strong> es lo que ocurre en operación frente a la{' '}
          <strong className="text-foreground">meta</strong>.
          {cur != null && tgt != null ? (
            <>
              {' '}
              Aquí: <span className="tabular-nums font-medium text-foreground">{cur}</span>
              {u} medido vs <span className="tabular-nums font-medium text-foreground">{tgt}</span>
              {u} como objetivo.
            </>
          ) : cur != null ? (
            <>
              {' '}
              Valor actual: <span className="tabular-nums font-medium text-foreground">{cur}</span>
              {u}.
            </>
          ) : null}
        </p>
        {status === 'on_track' ? (
          <p>
            El estado <strong className="text-foreground">{badge}</strong> significa que el <strong>avance</strong> (
            {barPct}%), es decir el progreso desde la línea base
            {base != null ? (
              <>
                {' '}
                (<span className="tabular-nums">{base}</span>
                {u})
              </>
            ) : null}{' '}
            hacia la meta, <strong className="text-foreground">supera el umbral verde</strong>.
          </p>
        ) : status === 'at_risk' ? (
          <p>
            El estado <strong className="text-foreground">{badge}</strong> indica <strong>avance intermedio</strong> (
            {barPct}%): avanzas hacia la meta pero sin el margen del umbral verde.
          </p>
        ) : (
          <p>
            El estado <strong className="text-foreground">{badge}</strong> indica que el avance ({barPct}%) está{' '}
            <strong className="text-foreground">por debajo del umbral amarillo</strong>.
          </p>
        )}
        {literalMetaCumplida === false && cur != null && tgt != null ? (
          <p className="border-t border-border/40 pt-2 text-muted-foreground">
            <strong className="text-foreground">Meta en valor</strong>:{' '}
            <span className="tabular-nums">{cur}</span>
            {u} aún no iguala o no está por debajo de{' '}
            <span className="tabular-nums">{tgt}</span>
            {u}.
          </p>
        ) : null}
      </div>
    )
  }

  if (calcMode === 'maximize') {
    return (
      <div className="space-y-2 leading-snug">
        <p>
          En indicadores donde <strong className="text-foreground">mayor es mejor</strong>, el{' '}
          <strong className="text-foreground">Actual</strong> es el resultado frente a la{' '}
          <strong className="text-foreground">meta</strong>.
          {cur != null && tgt != null ? (
            <>
              {' '}
              Aquí: <span className="tabular-nums font-medium text-foreground">{cur}</span>
              {u} vs <span className="tabular-nums font-medium text-foreground">{tgt}</span>
              {u}.
            </>
          ) : cur != null ? (
            <>
              {' '}
              Valor actual: <span className="tabular-nums font-medium text-foreground">{cur}</span>
              {u}.
            </>
          ) : null}
        </p>
        {status === 'on_track' ? (
          <p>
            El estado <strong className="text-foreground">{badge}</strong> indica que el avance ({barPct}%) supera el
            umbral verde.
          </p>
        ) : status === 'at_risk' ? (
          <p>
            El estado <strong className="text-foreground">{badge}</strong> indica avance intermedio ({barPct}%).
          </p>
        ) : (
          <p>
            El estado <strong className="text-foreground">{badge}</strong> indica avance bajo respecto a la meta.
          </p>
        )}
        {literalMetaCumplida === false && cur != null && tgt != null ? (
          <p className="border-t border-border/40 pt-2 text-muted-foreground">
            <strong className="text-foreground">Meta en valor</strong>:{' '}
            <span className="tabular-nums">{cur}</span>
            {u} aún no alcanza <span className="tabular-nums">{tgt}</span>
            {u}.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <p className="leading-snug">
      El estado <strong className="text-foreground">{badge}</strong> clasifica el avance ({barPct}%) frente a los
      umbrales.
      {cur != null ? (
        <>
          {' '}
          Valor actual{' '}
          <span className="tabular-nums">
            ({cur}
            {u})
          </span>
        </>
      ) : null}
      {tgt != null ? (
        <>
          {' '}
          · Meta{' '}
          <span className="tabular-nums">
            ({tgt}
            {u})
          </span>
        </>
      ) : null}
      .
    </p>
  )
}

export function KpiCard({ vm, onRegisterMeasurement, className }: KpiCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const {
    row,
    gapLabel,
    ownerLabel,
    compliancePct,
    status,
    weight,
    prevCompliancePct,
    noData,
    orphanGap,
    metaLine,
    currentValue,
    targetValue,
    unit,
    sparklineValues,
    literalMetaCumplida,
    kpiShortCode,
    activeBrechasCount,
    targetHorizonShort,
  } = vm

  const barPct = compliancePct != null ? Math.round(compliancePct * 100) : 0
  const prevBarPct = prevCompliancePct != null ? Math.round(prevCompliancePct * 100) : null
  const showTrendBars = prevCompliancePct != null && compliancePct != null && !noData
  const measurementCount = sparklineValues?.length ?? 0
  const hasEvolutionChart = measurementCount >= 2
  const firstMeasurement = measurementCount > 0 ? sparklineValues?.[0] ?? null : null
  const lastMeasurement = measurementCount > 0 ? sparklineValues?.[measurementCount - 1] ?? null : null

  const metricForHelp = catalogRowToMetric(row, currentValue)
  const calcMode = resolveEffectiveCalcType(metricForHelp)
  const modeCopy = calcModeLabel(calcMode)
  const thHelp = resolveEffectiveStatusThresholds(metricForHelp)
  const unitSuffix = unit ? ` ${unit}` : ''

  const executiveLine = buildKpiExecutiveInterpretation({
    noData,
    status,
    calcMode,
    currentValue,
    targetValue,
    compliancePct,
    unit,
    literalMetaCumplida,
  })

  const titleHead =
    kpiShortCode && kpiShortCode.trim().length > 0 ? `${kpiShortCode} · ${row.nombre}` : row.nombre

  const brechasN = activeBrechasCount ?? 0
  const detalleMetaParts = [
    metaLine,
    ownerLabel ? `Responsable: ${ownerLabel}` : null,
    weight != null && Number.isFinite(weight) ? `Peso en portafolio: ${(weight * 100).toFixed(1)}%` : null,
    !row.gap_id ? 'Sin gap vinculado en catálogo' : null,
    orphanGap ? 'Referencia de gap no encontrada en el tablero' : null,
    gapLabel ? `Brecha: ${gapLabel}` : null,
  ].filter(Boolean) as string[]

  return (
    <Card
      data-kpi-id={row.id}
      data-kpi-name={row.nombre}
      className={cn(
        'kpi-dashboard__card overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px] dark:ring-white/[0.05]',
        className
      )}
    >
      <CardContent className="space-y-5 p-5 sm:p-6">
        {/* Header ejecutivo */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-[15px]">
              {titleHead}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(status, noData))}
              aria-hidden
            />
            <span className="text-[11px] font-semibold text-foreground">
              {statusExecutiveLabel(status, noData)}
            </span>
          </div>
        </div>

        {orphanGap ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            El KPI referencia un gap que no aparece cargado; revisa catálogo o permisos.
          </p>
        ) : null}

        {/* Métrica protagonista */}
        <div className="space-y-1 border-b border-border/40 pb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Valor actual</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {noData ? '—' : formatNum(currentValue)}
            {unit ? <span className="ml-1.5 text-xl font-medium text-muted-foreground sm:text-2xl">{unit}</span> : null}
          </p>
          <p className="text-sm text-muted-foreground">
            Meta{targetHorizonShort ? ` (${targetHorizonShort})` : ''}:{' '}
            <span className="font-medium tabular-nums text-foreground">{formatNum(targetValue)}</span>
            {unit ? <span className="text-muted-foreground">{unitSuffix}</span> : null}
          </p>
        </div>

        {/* Interpretación + avance */}
        <div
          className={cn(
            'rounded-xl border px-3.5 py-3 text-sm leading-relaxed',
            noData && 'border-border/60 bg-muted/20 text-muted-foreground',
            !noData && status === 'on_track' && 'border-emerald-500/25 bg-emerald-500/[0.07]',
            !noData && status === 'at_risk' && 'border-amber-500/25 bg-amber-500/[0.08]',
            !noData && status === 'off_track' && 'border-destructive/30 bg-destructive/[0.06]'
          )}
        >
          {executiveLine}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-muted-foreground">Avance hacia la meta</span>
            <span className="tabular-nums font-semibold text-foreground">{noData ? '—' : `${barPct}%`}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                noData && 'bg-muted-foreground/25',
                !noData && status === 'on_track' && 'bg-emerald-500',
                !noData && status === 'at_risk' && 'bg-amber-500',
                !noData && status === 'off_track' && 'bg-destructive'
              )}
              style={{ width: noData ? '0%' : `${Math.min(100, barPct)}%` }}
            />
          </div>
        </div>

        {/* Conexión negocio */}
        <div className="text-sm">
          {brechasN > 0 ? (
            <p className="leading-snug">
              <span className="font-medium text-foreground">Relacionado con </span>
              <Link
                to={ROUTES.DASHBOARD_GAPS}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {brechasN === 1 ? '1 brecha activa' : `${brechasN} brechas activas`}
              </Link>
              <span className="text-muted-foreground"> en el tablero de gaps.</span>
            </p>
          ) : row.gap_id ? (
            <p className="text-muted-foreground">
              Brecha vinculada{gapLabel ? ` «${gapLabel}»` : ''}: sin pendientes activos o ya cerrada en el tablero.
            </p>
          ) : (
            <p className="text-muted-foreground">Sin brecha vinculada en catálogo.</p>
          )}
        </div>

        {onRegisterMeasurement ? (
          <Button type="button" className="h-10 w-full font-medium shadow-sm" onClick={onRegisterMeasurement}>
            <ClipboardList className="mr-2 h-4 w-4" aria-hidden />
            Realizar medición
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-border/70 font-medium text-foreground"
          onClick={() => setDetailOpen(true)}
        >
          <FileText className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
          Ver detalle técnico
        </Button>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent
            showClose
            aria-describedby={undefined}
            className="flex max-h-[min(85vh,800px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          >
            <div className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <DialogTitle className="text-left text-base font-semibold sm:text-lg">Detalle técnico del KPI</DialogTitle>
              <DialogDescription className="pt-1.5 text-left text-sm">
                {titleHead}. Lee primero la configuración, luego la regla de cálculo y al final la evolución.
              </DialogDescription>
            </div>
            <div className="kpi-card__detail-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
            {detalleMetaParts.length > 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Configuración del indicador
                </p>
                <ul className="grid gap-2 text-xs sm:grid-cols-2">
                  {detalleMetaParts.map((part) => (
                    <li key={part} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                      <span>{part}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Target className="h-4 w-4" aria-hidden />
                Guía de lectura
              </p>
              <p className="mt-2 font-semibold text-foreground">{modeCopy.title}</p>
              <p className="mt-1.5 text-sm leading-6">{modeCopy.explain}</p>
              <p className="mt-2 text-sm leading-6">{modeCopy.advanceExplain}</p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <dt className="text-xs text-muted-foreground">Línea base</dt>
                <dd className="mt-1 font-semibold tabular-nums text-foreground">
                  {formatNum(row.baseline)}
                  {unitSuffix}
                </dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <dt className="text-xs text-muted-foreground">Meta tablero</dt>
                <dd className="mt-1 font-semibold tabular-nums text-foreground">
                  {formatNum(targetValue)}
                  {unitSuffix}
                </dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <dt className="text-xs text-muted-foreground">Valor actual</dt>
                <dd className="mt-1 font-semibold tabular-nums text-foreground">
                  {currentValue != null && Number.isFinite(currentValue) ? formatNum(currentValue) : '—'}
                  {unitSuffix}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
              <p className="font-semibold text-foreground">Semáforo sobre % de avance</p>
              <p className="mt-1 leading-6">
                Verde: avance ≥ <span className="tabular-nums font-medium">{(thHelp.greenMin * 100).toFixed(0)}%</span>.
                Amarillo: entre{' '}
                <span className="tabular-nums font-medium">{(thHelp.yellowMin * 100).toFixed(0)}%</span> y ese umbral.
                Rojo: por debajo.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-background/50 p-3">
              <p className="font-semibold text-foreground">Interpretación extendida</p>
              <KpiOperationalStatusInterpretation
                kpiNombre={row.nombre}
                calcMode={calcMode}
                status={status}
                noData={noData}
                currentValue={currentValue}
                targetValue={targetValue}
                baseline={row.baseline}
                unit={unit}
                literalMetaCumplida={literalMetaCumplida}
                barPct={barPct}
              />
            </div>

            <div
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                literalMetaCumplida === true && 'border-emerald-500/35 bg-emerald-500/5',
                literalMetaCumplida === false && 'border-destructive/35 bg-destructive/5',
                literalMetaCumplida === null && 'border-border bg-muted/30'
              )}
            >
              <span>Meta en valor (absoluto)</span>
              {literalMetaCumplida === null ? (
                <span className="font-medium text-muted-foreground">—</span>
              ) : literalMetaCumplida ? (
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  Cumple
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-semibold text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                  No cumple
                </span>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <p className="text-xs leading-5">
                «Actual» es el último valor registrado. El avance y el semáforo son derivados para el tablero; no
                sustituyen al dato fuente.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
              <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  Evolución de mediciones
                </span>
                <span>
                  {measurementCount > 0 ? `${measurementCount} medición${measurementCount === 1 ? '' : 'es'}` : 'Sin histórico'}
                </span>
              </div>
              {hasEvolutionChart ? (
                <div className="flex flex-wrap items-center gap-3">
                  <KpiSparkline
                    values={sparklineValues!}
                    width={176}
                    height={42}
                    className="min-w-0 flex-1 text-primary"
                    label={`Evolución de mediciones: ${row.nombre}`}
                  />
                  <div className="grid shrink-0 gap-1 text-[10px] tabular-nums">
                    <div>
                      <p className="text-muted-foreground">Inicio</p>
                      <p className="font-medium text-foreground">{formatValueWithUnit(firstMeasurement, unit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última</p>
                      <p className="font-medium text-foreground">{formatValueWithUnit(lastMeasurement, unit)}</p>
                    </div>
                  </div>
                </div>
              ) : measurementCount === 1 ? (
                <div className="flex items-center justify-between gap-2">
                  <span>Una sola medición registrada.</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatValueWithUnit(lastMeasurement, unit)}
                  </span>
                </div>
              ) : (
                <p>Aún no hay suficiente histórico. Registra mediciones para ver la serie.</p>
              )}
            </div>

            {showTrendBars ? (
              <div className="mt-4 space-y-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Última vs penúltima medición
                </p>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="w-16 shrink-0 text-muted-foreground">Anterior</span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-muted-foreground/45" style={{ width: `${prevBarPct}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">{prevBarPct}%</span>
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
                  <span className="w-9 shrink-0 text-right tabular-nums font-medium text-foreground">{barPct}%</span>
                </div>
              </div>
            ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
