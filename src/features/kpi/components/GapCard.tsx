import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  Gauge,
  ListChecks,
  Sigma,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { InfoHint } from '@/components/InfoHint'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import type { GapKpiLink } from '../hooks'
import type { Gap, GapStatus } from '../types/kpi.types'
import type { KpiComplianceStatus } from '../utils/kpiCalculations'

/** Agrupación ejecutiva (semáforo del KPI principal vinculado). */
export type GapBusinessSeverity = 'critico' | 'riesgo' | 'controlado'

export type KpiSemaforoCounts = {
  on_track: number
  at_risk: number
  off_track: number
  sin_datos: number
}

export type GapStoryImpactRow = {
  id: string
  titulo: string
  storyPoints: number
  impactGlobalPct: number | null
}

export type GapPrimaryKpiSummary = {
  code: string
  nombre: string
  compliancePct: number | null
  status: KpiComplianceStatus | null
  weightPct: number | null
}

export type GapCardViewModel = {
  gap: Gap
  donePoints: number
  totalPoints: number
  progressPct: number
  gapKpiLink: GapKpiLink | null
  kpiNames: string[]
  kpiWeightSum: number | null
  kpiSemaforoCounts: KpiSemaforoCounts | null
  accionesCount: number
  /** Acciones no cerradas (distinto de Hecho / Verificado). */
  accionesActivasCount: number
  ownerLabel: string | null
  noAccionesWarning: boolean
  storyImpactRows?: GapStoryImpactRow[]
  severidad: GapBusinessSeverity
  /** Primer KPI del gap (catálogo), para lectura ejecutiva. */
  primaryKpi: GapPrimaryKpiSummary | null
  /** Una línea en lenguaje de negocio (descripción o aviso). */
  problemaHumanLine: string
}

function statusLabel(status: GapStatus): string {
  switch (status) {
    case 'open':
      return 'Abierto'
    case 'in_progress':
      return 'En curso'
    case 'resolved':
      return 'Resuelto'
    case 'closed':
      return 'Cerrado'
    default:
      return status
  }
}

function severidadLabel(s: GapBusinessSeverity): string {
  switch (s) {
    case 'critico':
      return 'Crítico'
    case 'riesgo':
      return 'En riesgo'
    case 'controlado':
      return 'Controlado'
  }
}

function severidadDotClass(s: GapBusinessSeverity): string {
  switch (s) {
    case 'critico':
      return 'bg-destructive shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
    case 'riesgo':
      return 'bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]'
    case 'controlado':
      return 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
  }
}

function severidadPanelClass(s: GapBusinessSeverity): string {
  switch (s) {
    case 'critico':
      return 'border-destructive/35 bg-destructive/[0.07]'
    case 'riesgo':
      return 'border-amber-500/30 bg-amber-500/[0.08]'
    case 'controlado':
      return 'border-emerald-500/30 bg-emerald-500/[0.07]'
  }
}

export function GapCard({ vm }: { vm: GapCardViewModel }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const {
    gap,
    donePoints,
    totalPoints,
    progressPct,
    gapKpiLink,
    kpiNames,
    kpiWeightSum,
    kpiSemaforoCounts,
    accionesCount,
    accionesActivasCount,
    ownerLabel,
    noAccionesWarning,
    storyImpactRows,
    severidad,
    primaryKpi,
    problemaHumanLine,
  } = vm

  const semTotal =
    kpiSemaforoCounts != null
      ? kpiSemaforoCounts.on_track +
        kpiSemaforoCounts.at_risk +
        kpiSemaforoCounts.off_track +
        kpiSemaforoCounts.sin_datos
      : 0
  const barPct = Number.isFinite(progressPct) ? Math.min(100, Math.max(0, progressPct)) : 0
  const ptsLabel =
    totalPoints > 0
      ? `${donePoints.toLocaleString('es-MX', { maximumFractionDigits: 1 })} / ${totalPoints.toLocaleString('es-MX', { maximumFractionDigits: 1 })} pts`
      : `${donePoints.toLocaleString('es-MX', { maximumFractionDigits: 1 })} / —`
  const gapLinkPct = Math.round((gapKpiLink?.avancePct ?? 0) * 100)
  const gapLinkStateLabel =
    gapKpiLink?.estado === 'cerrado'
      ? 'Cerrado'
      : gapKpiLink?.estado === 'en_progreso'
        ? 'En progreso'
        : 'Abierto'

  const kpiImpactLine =
    primaryKpi != null ? (
      <>
        Impacta al indicador{' '}
        <span className="font-semibold text-foreground">
          {primaryKpi.code} · {primaryKpi.nombre}
        </span>
        {primaryKpi.weightPct != null ? (
          <span className="text-muted-foreground"> ({primaryKpi.weightPct}% del portafolio)</span>
        ) : null}
      </>
    ) : (
      <span className="text-muted-foreground">Sin indicador O2C vinculado en catálogo.</span>
    )

  const cumplimientoLine =
    primaryKpi?.compliancePct != null ? (
      <span className="tabular-nums font-semibold text-foreground">
        Cumplimiento del indicador: {primaryKpi.compliancePct}%
      </span>
    ) : (
      <span className="text-muted-foreground">Sin medición reciente del indicador.</span>
    )

  const planCopy =
    totalPoints <= 0
      ? 'Este problema aún no tiene plan de resolución (puntos de esfuerzo).'
      : null

  return (
    <Card
      data-gap-id={gap.id}
      className="overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]"
    >
      <CardContent className="space-y-4 p-5 sm:p-6">
        {/* Problema (negocio) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', severidadDotClass(severidad))} aria-hidden />
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">{gap.nombre}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Problema: </span>
              {problemaHumanLine}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {statusLabel(gap.status)}
        </Badge>
      </div>

      {/* Severidad + KPI */}
      <div
        className={cn(
          'rounded-xl border px-3.5 py-3 text-sm leading-relaxed',
          severidadPanelClass(severidad)
        )}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
          {severidadLabel(severidad)}
        </p>
        <p className="mt-2 text-sm">{kpiImpactLine}</p>
        <p className="mt-1.5">{cumplimientoLine}</p>
      </div>

      {planCopy ? (
        <p className="text-sm text-amber-800 dark:text-amber-200" role="status">
          {planCopy}
        </p>
      ) : null}

      {/* Resolución (puntos) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            Progreso
          </span>
          <span className="font-semibold tabular-nums text-foreground">{ptsLabel}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              totalPoints === 0 ? 'bg-muted-foreground/30' : 'bg-primary'
            )}
            style={{ width: totalPoints === 0 ? '0%' : `${barPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Story points cerrados (Hecho / Verificado) frente al total del problema.
        </p>
      </div>

      {/* Causa / KPI */}
      <div className="rounded-xl border border-border/45 bg-muted/15 px-3.5 py-3 dark:bg-muted/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Causado por</p>
        {primaryKpi ? (
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {primaryKpi.code} — {primaryKpi.nombre}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">Ningún KPI catalogado enlazado a esta brecha.</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{accionesActivasCount}</span>
          <span className="text-muted-foreground">
            {' '}
            {accionesActivasCount === 1 ? 'acción activa' : 'acciones activas'} para resolverlo
          </span>
          {accionesCount !== accionesActivasCount ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {accionesCount} en total (incluye cerradas)
            </span>
          ) : null}
        </div>
        <Button size="sm" className="h-9 w-full shrink-0 font-medium sm:w-auto" asChild>
          <Link to={`${ROUTES.KANBAN}?gap=${encodeURIComponent(gap.id)}`}>Ver acciones</Link>
        </Button>
      </div>

      {noAccionesWarning ? (
        <p
          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          No hay acciones ligadas a este problema: define trabajo en el Kanban o revisa vínculos en catálogo.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-border/40 pt-4">
        {(gap.area || ownerLabel) && (
          <p className="w-full text-[11px] text-muted-foreground">
            {[gap.area && `Área: ${gap.area}`, ownerLabel && `Responsable: ${ownerLabel}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 font-medium sm:flex-none"
          onClick={() => setDetailOpen(true)}
        >
          <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Detalle técnico
        </Button>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          showClose
          aria-describedby={undefined}
          className="flex max-h-[min(85vh,820px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <div className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            <DialogTitle className="text-left text-base font-semibold sm:text-lg">Detalle técnico</DialogTitle>
            <DialogDescription className="pt-1.5 text-left text-sm">{gap.nombre}</DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-xs leading-relaxed text-muted-foreground sm:px-6">
            <p className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] text-foreground">
              Estado en catálogo: <strong>{statusLabel(gap.status)}</strong>
              {gap.prioridad ? <> · Prioridad: {gap.prioridad}</> : null}
            </p>

            {gapKpiLink && (
              <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Target className="h-3.5 w-3.5" />
                    Avance gap ↔ KPI (motor tablero)
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
                    <span
                      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', {
                        'bg-emerald-500': gapKpiLink.estado === 'cerrado',
                        'bg-amber-500': gapKpiLink.estado === 'en_progreso',
                        'bg-muted-foreground/40': gapKpiLink.estado === 'abierto',
                      })}
                      aria-hidden
                    />
                    {gapLinkStateLabel}
                  </span>
                </div>
                {gapKpiLink.totalPuntosGap > 0 ? (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          gapKpiLink.estado === 'cerrado' && 'bg-emerald-500',
                          gapKpiLink.estado === 'en_progreso' && 'bg-amber-500',
                          gapKpiLink.estado === 'abierto' && 'bg-muted-foreground/30'
                        )}
                        style={{ width: `${gapLinkPct}%` }}
                      />
                    </div>
                    <span className="tabular-nums">{gapLinkPct}%</span>
                    <span className="tabular-nums">
                      {gapKpiLink.puntosCompletados}/{gapKpiLink.totalPuntosGap} pts
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin puntos totales definidos en el catálogo del gap.</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {gapKpiLink.kpiNombre ? (
                    <>
                      <ArrowRight className="h-3 w-3" />
                      <span>{gapKpiLink.kpiNombre}</span>
                      {gapKpiLink.kpiPeso != null && (
                        <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
                          peso {(gapKpiLink.kpiPeso * 100).toFixed(0)}%
                        </span>
                      )}
                      {gapKpiLink.kpiCumplimiento != null && (
                        <span className="tabular-nums">cumplimiento {(gapKpiLink.kpiCumplimiento * 100).toFixed(0)}%</span>
                      )}
                    </>
                  ) : (
                    <span>Sin KPI vinculado en el enlace.</span>
                  )}
                </div>
              </div>
            )}

            {kpiWeightSum != null && kpiWeightSum > 0 && (
              <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
                <p className="inline-flex items-center gap-1">
                  <Sigma className="h-3.5 w-3.5" />
                  Σ pesos KPI (activos)
                  <InfoHint text="Suma analítica de pesos KPI activos del gap. No necesariamente debe ser 1.0." />
                  : <span className="font-medium tabular-nums text-foreground">{kpiWeightSum.toFixed(4)}</span>
                </p>
              </div>
            )}

            {kpiSemaforoCounts != null && semTotal > 0 && (
              <div className="mt-4 rounded-md border border-border/60 bg-muted/25 px-2.5 py-2">
                <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
                  <Target className="h-3.5 w-3.5" />
                  Semáforo KPI (catálogo)
                  <InfoHint text="Conteo de KPIs vinculados por estado de cumplimiento." />
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                      En meta
                    </span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {kpiSemaforoCounts.on_track}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                      En riesgo
                    </span>
                    <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {kpiSemaforoCounts.at_risk}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                      Fuera
                    </span>
                    <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {kpiSemaforoCounts.off_track}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                      Sin datos
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{kpiSemaforoCounts.sin_datos}</span>
                  </div>
                </div>
              </div>
            )}

            {kpiNames.length > 0 && (
              <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
                <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
                  <ListChecks className="h-3.5 w-3.5" />
                  KPIs vinculados
                </p>
                <ul className="list-inside list-disc text-sm text-foreground">
                  {kpiNames.map((name, idx) => (
                    <li key={`${name}-${idx}`} className="truncate">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {storyImpactRows && storyImpactRows.length > 0 && (
              <details className="mt-4 rounded-md border border-border/70 bg-muted/25">
                <summary className="cursor-pointer list-none px-2.5 py-2 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  Impacto potencial al score global (por acción)
                </summary>
                <div className="border-t border-border/60 px-2 pb-2 pt-2">
                  <p className="mb-2 text-[10px] leading-snug text-muted-foreground">
                    Metodología de reparto del peso del gap entre historias (referencia analítica).
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded border border-border/50">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                          <th className="px-2 py-1 font-medium">Acción</th>
                          <th className="w-12 px-1 py-1 font-medium tabular-nums">Pts</th>
                          <th className="w-16 px-1 py-1 font-medium tabular-nums">% global</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storyImpactRows.map((row) => (
                          <tr key={row.id} className="border-b border-border/40 last:border-0">
                            <td className="max-w-[12rem] truncate px-2 py-1 text-foreground" title={row.titulo}>
                              {row.titulo}
                            </td>
                            <td className="px-1 py-1 tabular-nums text-muted-foreground">{row.storyPoints}</td>
                            <td className="px-1 py-1 tabular-nums text-foreground">
                              {row.impactGlobalPct != null ? `${row.impactGlobalPct.toFixed(2)}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            )}

            {gapKpiLink?.kpiPeso != null && (
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                <span>Aporte al portafolio si se cierra el gap</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold tabular-nums text-primary">
                  +{(gapKpiLink.kpiPeso * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  )
}
