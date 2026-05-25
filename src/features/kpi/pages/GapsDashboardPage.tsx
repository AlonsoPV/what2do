/**
 * Tablero de brechas O2C: cards con progreso por story points y estado del gap.
 */

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Filter,
  ListChecks,
  RefreshCw,
  Target,
} from 'lucide-react'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { InfoHint } from '@/components/InfoHint'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers } from '@/features/users/hooks/useUsers'
import { GapCard, type GapBusinessSeverity, type GapCardViewModel, type KpiSemaforoCounts } from '../components/GapCard'
import { useCatalogKpiO2cMetricItems, useGapAccionesForGapIds, useGapKpiLinks, useGaps } from '../hooks'
import type { CatalogKpiMetricItem } from '../hooks/useCatalogKpiMetricsList'
import type { CatalogKpiO2cRow, Gap, GapStatus } from '../types/kpi.types'
import { accionStoryPoints, computeGapStoryProgress, isAccionEstadoDone } from '../utils/gapProgress'
import {
  computeStoryGlobalImpactPercent,
  FIBONACCI_STORY_POINTS,
  moscowPointsBudget,
  TARGET_SPRINT_VELOCITY_POINTS,
} from '../utils/storyPointsMethodology'
import { getGapWeight } from '../utils/kpiCalculations'

type SortKey = 'nombre' | 'progress' | 'status' | 'prioridad'
type SortDir = 'asc' | 'desc'

function deriveGapSeveridad(gap: Gap, primary: CatalogKpiMetricItem | null): GapBusinessSeverity {
  if (gap.status === 'closed' || gap.status === 'resolved') return 'controlado'
  if (!primary) return 'riesgo'
  if (primary.status === 'off_track') return 'critico'
  if (primary.status === 'at_risk') return 'riesgo'
  if (primary.status === 'on_track') return 'controlado'
  return 'riesgo'
}

function gapProblemaHumanLine(gap: Gap): string {
  const d = gap.descripcion?.trim()
  if (!d) {
    return 'Aún no hay una descripción clara del problema; complétala en catálogo para alinear al equipo.'
  }
  const oneLine = d.replace(/\s+/g, ' ')
  return oneLine.length > 140 ? `${oneLine.slice(0, 137)}…` : oneLine
}

function formatPct(value: number): string {
  return Number.isFinite(value) ? `${Math.round(value)}%` : '0%'
}

function gapStatusStoryLabel(status: GapStatus): string {
  switch (status) {
    case 'open':
      return 'abierta'
    case 'in_progress':
      return 'en curso'
    case 'resolved':
      return 'resuelta'
    case 'closed':
      return 'cerrada'
    default:
      return status
  }
}

export function GapsDashboardPage() {
  const { data: gaps = [], isLoading: gapsLoading } = useGaps({ filters: { activo: true } })
  const { kpiRows, metricItems, isLoading: kpisLoading } = useCatalogKpiO2cMetricItems({
    activo: true,
  })
  const gapIds = useMemo(() => gaps.map((g) => g.id), [gaps])
  const { data: accionesData, isLoading: accionesLoading } = useGapAccionesForGapIds(gapIds)
  const acciones = useMemo(() => accionesData?.acciones ?? [], [accionesData?.acciones])
  const junctionAccionIdsByGap = useMemo(
    () => accionesData?.junctionAccionIdsByGap ?? new Map<string, Set<string>>(),
    [accionesData?.junctionAccionIdsByGap]
  )
  const { links: gapKpiLinks, isLoading: gapKpiLinksLoading } = useGapKpiLinks()
  const { data: users = [] } = useUsers({ activo: true })

  const userById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.nombre)
    return m
  }, [users])

  const kpisByGapId = useMemo(() => {
    const m = new Map<string, CatalogKpiO2cRow[]>()
    for (const row of kpiRows) {
      const gid = row.gap_id
      if (!gid) continue
      const list = m.get(gid) ?? []
      list.push(row)
      m.set(gid, list)
    }
    return m
  }, [kpiRows])

  const kpiSemaforoByGapId = useMemo(() => {
    const m = new Map<string, KpiSemaforoCounts>()
    for (const item of metricItems) {
      const gid = item.row.gap_id
      if (!gid) continue
      const cur = m.get(gid) ?? { on_track: 0, at_risk: 0, off_track: 0, sin_datos: 0 }
      if (item.compliance === null || item.status === null) cur.sin_datos++
      else if (item.status === 'on_track') cur.on_track++
      else if (item.status === 'at_risk') cur.at_risk++
      else cur.off_track++
      m.set(gid, cur)
    }
    return m
  }, [metricItems])

  const metricItemsByGapId = useMemo(() => {
    const m = new Map<string, CatalogKpiMetricItem[]>()
    for (const item of metricItems) {
      const gid = item.row.gap_id
      if (!gid) continue
      const list = m.get(gid) ?? []
      list.push(item)
      m.set(gid, list)
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.row.orden - b.row.orden)
    }
    return m
  }, [metricItems])

  const gapKpiLinkById = useMemo(() => {
    const map = new Map<string, (typeof gapKpiLinks)[number]>()
    for (const link of gapKpiLinks) map.set(link.gapId, link)
    return map
  }, [gapKpiLinks])

  const baseCards = useMemo((): GapCardViewModel[] => {
    const out = gaps.map((gap) => {
      const junctionSet = junctionAccionIdsByGap.get(gap.id)
      const forGap = acciones.filter(
        (a) => a.gap_id === gap.id || junctionSet?.has(a.id)
      )
      const accionesCount = forGap.length
      const accionesActivasCount = forGap.filter((a) => !isAccionEstadoDone(a.estado)).length
      const metricsForGap = metricItemsByGapId.get(gap.id) ?? []
      const primaryMetric = metricsForGap[0] ?? null
      const severidad = deriveGapSeveridad(gap, primaryMetric)
      const primaryKpi = primaryMetric
        ? {
            code: `KPI-${String(primaryMetric.row.orden).padStart(2, '0')}`,
            nombre: primaryMetric.row.nombre,
            compliancePct:
              primaryMetric.compliance != null ? Math.round(primaryMetric.compliance * 100) : null,
            status: primaryMetric.status,
            weightPct:
              primaryMetric.row.weight != null ? Math.round(primaryMetric.row.weight * 100) : null,
          }
        : null
      const problemaHumanLine = gapProblemaHumanLine(gap)
      const { donePoints, totalPoints } = computeGapStoryProgress(
        gap.id,
        acciones,
        gap.total_story_points ?? 0,
        junctionSet
      )
      const progressPct = totalPoints > 0 ? (donePoints / totalPoints) * 100 : 0
      const kpis = kpisByGapId.get(gap.id) ?? []
      const kpiWeightSum = (() => {
        const s = getGapWeight(
          gap.id,
          kpiRows.map((k) => ({ gap_id: k.gap_id, weight: k.weight, activo: k.activo })),
          { onlyActivo: true }
        )
        return s > 0 ? s : null
      })()
      const kpiNames = kpis
        .filter((k) => k.activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map((k) => k.nombre)
      const oid = gap.owner_usuario
      const ownerLabel = oid ? userById.get(oid) ?? oid : null
      const kpiSemaforoCounts = kpiSemaforoByGapId.get(gap.id) ?? null

      const storyImpactRows =
        kpiWeightSum != null &&
        kpiWeightSum > 0 &&
        totalPoints > 0 &&
        forGap.length > 0
          ? forGap.map((a) => ({
              id: a.id,
              titulo: a.titulo_accion,
              storyPoints: accionStoryPoints(a),
              impactGlobalPct: computeStoryGlobalImpactPercent({
                kpiWeightSum,
                storiesInGap: forGap.length,
                storyPoints: accionStoryPoints(a),
                totalStoryPointsInGap: totalPoints,
              }),
            }))
          : undefined

      return {
        gap,
        donePoints,
        totalPoints,
        progressPct,
        gapKpiLink: gapKpiLinkById.get(gap.id) ?? null,
        kpiNames,
        kpiWeightSum,
        kpiSemaforoCounts,
        accionesCount,
        accionesActivasCount,
        ownerLabel,
        noAccionesWarning: accionesCount === 0,
        storyImpactRows,
        severidad,
        primaryKpi,
        problemaHumanLine,
      }
    })
    if (import.meta.env.DEV && gaps.length > 0) {
      console.log('Gaps progreso recalculado', { gaps: gaps.length })
    }
    return out
  }, [
    gaps,
    acciones,
    junctionAccionIdsByGap,
    gapKpiLinkById,
    kpisByGapId,
    userById,
    kpiRows,
    kpiSemaforoByGapId,
    metricItemsByGapId,
  ])

  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<GapStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('nombre')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    for (const g of gaps) {
      if (g.area) set.add(g.area)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [gaps])

  const ownerOptions = useMemo(() => {
    const set = new Set<string>()
    for (const g of gaps) {
      if (g.owner_usuario) set.add(g.owner_usuario)
    }
    return [...set].sort((a, b) => (userById.get(a) ?? a).localeCompare(userById.get(b) ?? b))
  }, [gaps, userById])

  const filtered = useMemo(() => {
    return baseCards.filter((vm) => {
      const g = vm.gap
      if (areaFilter !== 'all' && (g.area ?? '') !== areaFilter) return false
      if (ownerFilter !== 'all' && (g.owner_usuario ?? '') !== ownerFilter) return false
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      return true
    })
  }, [baseCards, areaFilter, ownerFilter, statusFilter])

  const chainHeader = useMemo(
    () => ({
      visibles: filtered.length,
      cerrados: filtered.filter((vm) => vm.gapKpiLink?.estado === 'cerrado').length,
      enProgreso: filtered.filter((vm) => vm.gapKpiLink?.estado === 'en_progreso').length,
      ptsDone: filtered.reduce((sum, vm) => sum + (vm.donePoints ?? 0), 0),
      ptsTotal: filtered.reduce((sum, vm) => sum + (vm.totalPoints ?? 0), 0),
    }),
    [filtered]
  )

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const list = [...filtered]
    const statusRank = (s: GapStatus) =>
      s === 'open' ? 0 : s === 'in_progress' ? 1 : s === 'resolved' ? 2 : 3
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'nombre':
          cmp = a.gap.nombre.localeCompare(b.gap.nombre, 'es')
          break
        case 'progress':
          cmp = a.progressPct - b.progressPct
          break
        case 'status':
          cmp = statusRank(a.gap.status) - statusRank(b.gap.status)
          break
        case 'prioridad': {
          const pa = a.gap.prioridad ?? ''
          const pb = b.gap.prioridad ?? ''
          cmp = pa.localeCompare(pb, 'es')
          break
        }
        default:
          cmp = 0
      }
      return cmp * dir
    })
    return list
  }, [filtered, sortKey, sortDir])

  const filteredSummary = useMemo(() => {
    let open = 0
    let inProgress = 0
    let resolved = 0
    let closed = 0

    for (const vm of filtered) {
      const st = vm.gap.status
      if (st === 'open') open += 1
      else if (st === 'in_progress') inProgress += 1
      else if (st === 'resolved') resolved += 1
      else if (st === 'closed') closed += 1
    }

    const avgProgress =
      filtered.length > 0
        ? filtered.reduce((acc, vm) => acc + (Number.isFinite(vm.progressPct) ? vm.progressPct : 0), 0) /
          filtered.length
        : 0

    return {
      total: filtered.length,
      open,
      inProgress,
      resolved,
      closed,
      avgProgress,
    }
  }, [filtered])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'nombre' || key === 'prioridad' ? 'asc' : 'desc')
    }
  }

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      {sortKey === k ? (
        sortDir === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  )

  const loading = gapsLoading || kpisLoading || accionesLoading || gapKpiLinksLoading
  const avancePortafolioPct =
    chainHeader.ptsTotal > 0
      ? Math.round((chainHeader.ptsDone / chainHeader.ptsTotal) * 100)
      : 0

  const gapGroups = useMemo(() => {
    const critico: GapCardViewModel[] = []
    const riesgo: GapCardViewModel[] = []
    const controlado: GapCardViewModel[] = []
    for (const vm of sorted) {
      if (vm.severidad === 'critico') critico.push(vm)
      else if (vm.severidad === 'riesgo') riesgo.push(vm)
      else controlado.push(vm)
    }
    return { critico, riesgo, controlado }
  }, [sorted])

  const moscowBudget = useMemo(() => moscowPointsBudget(TARGET_SPRINT_VELOCITY_POINTS), [])
  const activeActionsVisible = useMemo(
    () => filtered.reduce((sum, vm) => sum + vm.accionesActivasCount, 0),
    [filtered]
  )
  const focusGap = useMemo(() => {
    const priorityPool = [...gapGroups.critico, ...gapGroups.riesgo]
    const pool = priorityPool.length > 0 ? priorityPool : [...sorted]
    return (
      pool.sort((a, b) => {
        const severityRank = (vm: GapCardViewModel) =>
          vm.severidad === 'critico' ? 0 : vm.severidad === 'riesgo' ? 1 : 2
        const severityCmp = severityRank(a) - severityRank(b)
        if (severityCmp !== 0) return severityCmp
        const progressCmp = a.progressPct - b.progressPct
        if (progressCmp !== 0) return progressCmp
        return b.accionesActivasCount - a.accionesActivasCount
      })[0] ?? null
    )
  }, [gapGroups, sorted])
  const narrative = useMemo(() => {
    const critical = gapGroups.critico.length
    const risk = gapGroups.riesgo.length
    const controlled = gapGroups.controlado.length
    const headline =
      critical > 0
        ? `${critical} brecha${critical !== 1 ? 's' : ''} critica${critical !== 1 ? 's' : ''} concentra${critical !== 1 ? 'n' : ''} el riesgo operativo`
        : risk > 0
          ? `${risk} brecha${risk !== 1 ? 's' : ''} en riesgo requiere${risk !== 1 ? 'n' : ''} seguimiento`
          : controlled > 0
            ? 'El portafolio visible esta bajo control'
            : 'No hay brechas visibles con los filtros actuales'
    const focusName = focusGap?.gap.nombre ?? 'ninguna brecha prioritaria'
    const focusKpi = focusGap?.primaryKpi
      ? `${focusGap.primaryKpi.code} - ${focusGap.primaryKpi.nombre}`
      : 'sin KPI principal vinculado'
    const decision =
      focusGap != null
        ? `Foco sugerido: cerrar trabajo activo en "${focusName}" porque esta ${gapStatusStoryLabel(
            focusGap.gap.status
          )} y afecta ${focusKpi}.`
        : 'Ajusta filtros o crea una brecha accionable para construir una lectura ejecutiva.'
    return { headline, decision }
  }, [focusGap, gapGroups])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 overflow-x-hidden px-4 py-6 sm:px-6">
      <header className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Brechas O2C</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lectura de brechas</h1>
              <InfoHint text="Vista ejecutiva: prioriza el problema, su evidencia KPI, avance por story points y acciones abiertas." />
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Disenada para decidir donde intervenir primero: impacto operativo, evidencia del indicador y trabajo
              necesario para cerrar cada gap.
            </p>
          </div>
          <details className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs leading-relaxed text-muted-foreground sm:max-w-md">
            <summary className="cursor-pointer list-none font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              Metodologia
            </summary>
            <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
              <p>
                Fibonacci ({FIBONACCI_STORY_POINTS.join(', ')}) estima esfuerzo relativo. MoSCoW reparte una velocidad
                objetivo de {TARGET_SPRINT_VELOCITY_POINTS} pts: Must {moscowBudget.must}, Should {moscowBudget.should},
                Could {moscowBudget.could}.
              </p>
              <p>
                El impacto al score global reparte el peso KPI del gap entre historias; complementa, no reemplaza, la
                medicion del KPI.
              </p>
            </div>
          </details>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div className="rounded-lg border border-border/60 bg-card px-4 py-4 shadow-sm sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Historia ejecutiva
              </p>
            </div>
            <h2 className="mt-4 max-w-3xl text-xl font-semibold tracking-tight text-foreground">
              {narrative.headline}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{narrative.decision}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden />
                  Riesgo abierto
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {gapGroups.critico.length + gapGroups.riesgo.length}
                </p>
                <p className="text-[11px] text-muted-foreground">criticas o en riesgo</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Trabajo activo
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{activeActionsVisible}</p>
                <p className="text-[11px] text-muted-foreground">acciones por cerrar</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  Avance
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {formatPct(avancePortafolioPct)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {chainHeader.ptsDone} / {chainHeader.ptsTotal} pts
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/15 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Brecha foco</p>
            {focusGap ? (
              <div className="mt-3 space-y-3">
                <h3 className="text-base font-semibold leading-snug text-foreground">{focusGap.gap.nombre}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{focusGap.problemaHumanLine}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progreso de cierre</span>
                    <span className="font-medium tabular-nums text-foreground">{formatPct(focusGap.progressPct)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, focusGap.progressPct))}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {focusGap.accionesActivasCount} acciones activas - {focusGap.primaryKpi?.nombre ?? 'sin KPI principal'}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Sin brechas para priorizar con los filtros actuales.</p>
            )}
          </div>
        </section>
      </header>

      <header className="hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Brechas O2C</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Brechas O2C</h1>
          <InfoHint text="Problemas de negocio priorizados: severidad según el indicador vinculado, progreso en story points y acciones en el Kanban. El detalle técnico es opcional." />
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cada brecha es un problema a resolver, no un reporte: primero entiende qué está mal y qué indicador lo refleja;
          luego ejecuta con acciones en el tablero.
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <Target className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">Visibles:</span>
            <span className="font-medium tabular-nums text-foreground">{chainHeader.visibles}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Cerrados:</span>
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {chainHeader.cerrados}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Story pts:</span>
            <span className="font-medium tabular-nums text-foreground">
              {chainHeader.ptsDone} / {chainHeader.ptsTotal}
            </span>
          </div>
        </div>
        <details className="mt-3 max-w-3xl rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          <summary className="cursor-pointer list-none font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            Metodología: story points, MoSCoW e impacto en score global
          </summary>
          <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
            <p>
              <span className="font-medium text-foreground">Fibonacci ({FIBONACCI_STORY_POINTS.join(', ')}):</span>{' '}
              escala de estimación relativa (complejidad + incertidumbre) por acción.
            </p>
            <p>
              <span className="font-medium text-foreground">
                MoSCoW y velocidad objetivo (~{TARGET_SPRINT_VELOCITY_POINTS} pts/sprint):
              </span>{' '}
              capacidad orientativa Must ~{moscowBudget.must} pts, Should ~{moscowBudget.should} pts, Could ~
              {moscowBudget.could} pts (60% / 25% / 15%).
            </p>
            <p>
              <span className="font-medium text-foreground">Impacto en score global:</span> (Σ peso KPI del gap / nº
              acciones) × (pts de la acción / pts totales del gap). No sustituye al cumplimiento por medición del KPI;
              es reparto analítico del peso del gap entre historias.
            </p>
          </div>
        </details>
      </header>

      <section className="hidden">
        <SectionCard>
          <SectionCardHeader
            title="Avance del portafolio"
            subtitle="Story points en estado Hecho / Verificado sobre el total del portafolio de gaps."
          />
          <SectionCardBody className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progreso (Done)</span>
          <span className="font-medium tabular-nums text-foreground">{avancePortafolioPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${avancePortafolioPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {chainHeader.ptsDone} pts completados de {chainHeader.ptsTotal} totales
          {' · '}
          {chainHeader.cerrados} gap{chainHeader.cerrados !== 1 ? 's' : ''} cerrado{chainHeader.cerrados !== 1 ? 's' : ''}
          {' · '}
          {chainHeader.enProgreso} en progreso
        </p>
          </SectionCardBody>
        </SectionCard>
      </section>

      <section className="scroll-mt-4" aria-labelledby="gaps-filters-title">
        <SectionCard>
          <SectionCardHeader
            icon={Filter}
            titleId="gaps-filters-title"
            title="Exploracion del portafolio"
            subtitle="Ajusta el foco de lectura sin perder la historia ejecutiva: area, responsable, estado y prioridad."
            action={
              <div className="flex flex-wrap items-center gap-2">
                  <InfoHint text="Los filtros refinan la lista inferior y recalculan la lectura ejecutiva visible." />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAreaFilter('all')
                    setOwnerFilter('all')
                    setStatusFilter('all')
                  }}
                  disabled={
                    areaFilter === 'all' && ownerFilter === 'all' && statusFilter === 'all'
                  }
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Limpiar filtros
                </Button>
              </div>
            }
          />
          <SectionCardBody className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Total</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{filteredSummary.total}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Abiertas</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{filteredSummary.open}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">En curso</p>
            <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {filteredSummary.inProgress}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Resueltas</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {filteredSummary.resolved}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Cerradas</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{filteredSummary.closed}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Avance prom.</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {Number.isFinite(filteredSummary.avgProgress)
                ? `${Math.round(filteredSummary.avgProgress)}%`
                : '0%'}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="gap-filter-area">Área</Label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger id="gap-filter-area">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {areaOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gap-filter-owner">Responsable</Label>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger id="gap-filter-owner">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ownerOptions.map((id) => (
                  <SelectItem key={id} value={id}>
                    {userById.get(id) ?? id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gap-filter-status">Estado del gap</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GapStatus | 'all')}>
              <SelectTrigger id="gap-filter-status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En curso</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-3 lg:col-span-1">
            <span className="text-xs text-muted-foreground">Ordenar por:</span>
            <div className="flex flex-wrap gap-2">
              <SortButton k="nombre" label="Nombre" />
              <SortButton k="progress" label="Avance %" />
              <SortButton k="status" label="Estado" />
              <SortButton k="prioridad" label="Prioridad" />
            </div>
          </div>
        </div>
          </SectionCardBody>
        </SectionCard>
      </section>

      <section className="scroll-mt-4" aria-labelledby="gaps-list-title">
        <SectionCard>
          <SectionCardHeader
            icon={ListChecks}
            titleId="gaps-list-title"
            title={`Brechas priorizadas (${sorted.length})`}
            subtitle="Lee de arriba hacia abajo: riesgo, evidencia KPI, avance de cierre y acciones abiertas."
            action={
              <InfoHint text="Crítico = KPI principal fuera de meta. En riesgo = KPI en zona intermedia o sin dato claro. Controlado = KPI en meta o brecha cerrada/resuelta." />
            }
          />
          <SectionCardBody>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay gaps que coincidan con los filtros.</p>
        ) : (
          <div className="space-y-10">
            {gapGroups.critico.length > 0 ? (
              <div className="space-y-4" data-gap-group="criticos">
                <div className="flex flex-wrap items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Críticos</h3>
                  <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium tabular-nums text-destructive">
                    {gapGroups.critico.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gapGroups.critico.map((vm) => (
                    <GapCard key={vm.gap.id} vm={vm} />
                  ))}
                </div>
              </div>
            ) : null}
            {gapGroups.riesgo.length > 0 ? (
              <div className="space-y-4" data-gap-group="riesgo">
                <div className="flex flex-wrap items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                  <h3 className="text-base font-semibold tracking-tight text-foreground">En riesgo</h3>
                  <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-950 dark:text-amber-100">
                    {gapGroups.riesgo.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gapGroups.riesgo.map((vm) => (
                    <GapCard key={vm.gap.id} vm={vm} />
                  ))}
                </div>
              </div>
            ) : null}
            {gapGroups.controlado.length > 0 ? (
              <div className="space-y-4" data-gap-group="controlados">
                <div className="flex flex-wrap items-center gap-2 px-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Controlados</h3>
                  <span className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium tabular-nums text-emerald-950 dark:text-emerald-100">
                    {gapGroups.controlado.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gapGroups.controlado.map((vm) => (
                    <GapCard key={vm.gap.id} vm={vm} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
          </SectionCardBody>
        </SectionCard>
      </section>
    </div>
  )
}
