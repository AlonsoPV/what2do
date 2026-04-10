import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoHint } from '@/components/InfoHint'
import { cn } from '@/lib/utils'
import { Gauge, ListChecks, Sigma, Target } from 'lucide-react'
import type { Gap, GapStatus } from '../types/kpi.types'

/** Agregado de semáforo por KPI de catálogo (misma lógica que `CatalogKpiSemaforoGrid`). */
export type KpiSemaforoCounts = {
  on_track: number
  at_risk: number
  off_track: number
  sin_datos: number
}

export type GapCardViewModel = {
  gap: Gap
  donePoints: number
  totalPoints: number
  progressPct: number
  kpiNames: string[]
  /** Σ pesos de KPIs activos del gap (referencia analítica; no obligatorio = 1). */
  kpiWeightSum: number | null
  /** Resumen de cumplimiento por KPIs de catálogo vinculados al gap. */
  kpiSemaforoCounts: KpiSemaforoCounts | null
  accionesCount: number
  ownerLabel: string | null
  noAccionesWarning: boolean
}

function statusBadgeVariant(
  status: GapStatus
): 'default' | 'secondary' | 'outline' | 'success' | 'muted' {
  switch (status) {
    case 'open':
      return 'secondary'
    case 'in_progress':
      return 'default'
    case 'resolved':
      return 'success'
    case 'closed':
      return 'muted'
    default:
      return 'outline'
  }
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

export function GapCard({ vm }: { vm: GapCardViewModel }) {
  const {
    gap,
    donePoints,
    totalPoints,
    progressPct,
    kpiNames,
    kpiWeightSum,
    kpiSemaforoCounts,
    accionesCount,
    ownerLabel,
    noAccionesWarning,
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
      : `${donePoints.toLocaleString('es-MX', { maximumFractionDigits: 1 })} / — pts`

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">{gap.nombre}</CardTitle>
          <Badge variant={statusBadgeVariant(gap.status)}>{statusLabel(gap.status)}</Badge>
        </div>
        {gap.descripcion && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{gap.descripcion}</p>
        )}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {gap.area && (
            <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-muted-foreground">
              Área: <span className="font-medium text-foreground">{gap.area}</span>
            </span>
          )}
          {gap.prioridad && (
            <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-muted-foreground">
              Prioridad: <span className="font-medium text-foreground">{gap.prioridad}</span>
            </span>
          )}
          {ownerLabel && (
            <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-muted-foreground">
              Resp.: <span className="font-medium text-foreground">{ownerLabel}</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              Avance (story points)
              <InfoHint text="Avance calculado con puntos de acciones en estado Hecho/Verificado sobre el total del gap." />
            </span>
            <span className="font-medium tabular-nums text-foreground">{ptsLabel}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full bg-primary transition-all',
                totalPoints === 0 && 'bg-muted-foreground/30'
              )}
              style={{ width: totalPoints === 0 ? '0%' : `${barPct}%` }}
            />
          </div>
        </div>

        {kpiWeightSum != null && kpiWeightSum > 0 && (
          <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-1">
              <Sigma className="h-3.5 w-3.5" />Σ pesos KPI (activos)
              <InfoHint text="Suma analítica de pesos KPI activos del gap. No necesariamente debe ser 1.0." />
              : <span className="font-medium tabular-nums text-foreground">{kpiWeightSum.toFixed(4)}</span>
            </p>
          </div>
        )}

        {kpiSemaforoCounts != null && semTotal > 0 && (
          <div className="rounded-md border border-border/60 bg-muted/25 px-2.5 py-2">
            <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-foreground">
              <Target className="h-3.5 w-3.5" />
              Semáforo KPI (catálogo)
              <InfoHint text="Conteo de KPIs vinculados al gap por estado de cumplimiento: en meta, en riesgo, fuera y sin datos." />
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                En meta: {kpiSemaforoCounts.on_track}
              </span>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                En riesgo: {kpiSemaforoCounts.at_risk}
              </span>
              <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-700 dark:text-red-300">
                Fuera: {kpiSemaforoCounts.off_track}
              </span>
              <span className="rounded border bg-muted/50 px-2 py-1 text-muted-foreground">
                Sin datos: {kpiSemaforoCounts.sin_datos}
              </span>
            </div>
          </div>
        )}

        {kpiNames.length > 0 && (
          <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
            <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              KPIs vinculados
            </p>
            <ul className="list-inside list-disc text-sm text-foreground">
              {kpiNames.slice(0, 4).map((name, idx) => (
                <li key={`${name}-${idx}`} className="truncate">
                  {name}
                </li>
              ))}
              {kpiNames.length > 4 && (
                <li className="list-none text-xs text-muted-foreground">
                  +{kpiNames.length - 4} más
                </li>
              )}
            </ul>
          </div>
        )}

        <p className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground">
          Acciones vinculadas: <span className="font-medium text-foreground">{accionesCount}</span>
        </p>

        {noAccionesWarning && (
          <p
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100"
            role="status"
          >
            Sin acciones vinculadas a este gap.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
