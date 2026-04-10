/**
 * Tablero KPIs O2C: score global, filtros, lista ordenable y tarjetas por KPI.
 */

import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Gauge,
  Grid3X3,
  ListChecks,
  RefreshCw,
} from 'lucide-react'
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
import {
  useCatalogKpiO2cPortfolioPipeline,
  useGaps,
} from '../hooks'
import type { CatalogKpiO2cRow, Gap } from '../types/kpi.types'
import {
  computeComplianceTrendFromRecent,
  getGapWeights,
  resolveEffectiveStatusThresholds,
  resolveTarget,
  DEFAULT_O2C_TARGET_HORIZON,
  type KpiComplianceStatus,
  type KpiMetric,
  type TargetHorizon,
} from '../utils/kpiCalculations'
import { CatalogKpiSemaforoGrid } from '../components/CatalogKpiSemaforoGrid'
import { GlobalScoreHistoryChart } from '../components/GlobalScoreHistoryChart'
import { GlobalScoreWidget } from '../components/GlobalScoreWidget'
import { KpiCard, type KpiCardViewModel } from '../components/KpiCard'

type SortKey = 'nombre' | 'compliance' | 'weight' | 'area' | 'status'
type SortDir = 'asc' | 'desc'

type FilterStatus = 'all' | KpiComplianceStatus | 'sin_datos'

function horizonShortLabel(h: TargetHorizon): string {
  switch (h) {
    case 'm6':
      return 'M6'
    case 'm12':
      return 'M12'
    case 'm18':
    default:
      return 'M18'
  }
}

type EnrichedKpi = {
  row: CatalogKpiO2cRow
  gap: Gap | null
  metric: KpiMetric
  compliance: number | null
  status: KpiComplianceStatus | null
  trendDelta: number | null
  /** Penúltima medición con cumplimiento válido (para tendencia visual). */
  prevCompliance: number | null
}

export function KpisDashboardPage() {
  const [targetHorizon, setTargetHorizon] = useState<TargetHorizon>(DEFAULT_O2C_TARGET_HORIZON)

  const {
    metricItems,
    recentById,
    globalScore,
    portfolioBreakdown,
    weightWarning,
    coverage,
    isLoading: portfolioLoading,
    targetHorizon: pipelineHorizon,
  } = useCatalogKpiO2cPortfolioPipeline({ activo: true, targetHorizon })
  const { data: gaps = [], isLoading: gapsLoading } = useGaps({ filters: { activo: true } })
  const { data: users = [] } = useUsers({ activo: true })

  const gapById = useMemo(() => {
    const m = new Map<string, Gap>()
    for (const g of gaps) m.set(g.id, g)
    return m
  }, [gaps])

  const userById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.nombre)
    return m
  }, [users])

  const enriched = useMemo((): EnrichedKpi[] => {
    const recent = recentById ?? new Map()
    const out: EnrichedKpi[] = []

    for (const item of metricItems) {
      const { row, metric, compliance, status } = item

      const hist = recent.get(row.id)
      const trend = computeComplianceTrendFromRecent(row, hist, {
        targetHorizon: pipelineHorizon,
      })
      const { trendDelta, prevCompliance } = trend

      const gap = row.gap_id ? gapById.get(row.gap_id) ?? null : null
      out.push({ row, gap, metric, compliance, status, trendDelta, prevCompliance })
    }
    return out
  }, [metricItems, recentById, gapById, pipelineHorizon])

  /** Referencia analítica: suma de pesos por gap (sin exigencia de suma = 1 por gap). */
  const gapWeightRows = useMemo(() => {
    const wmap = getGapWeights(
      enriched.map((e) => ({
        gap_id: e.row.gap_id,
        weight: e.row.weight,
        activo: e.row.activo,
      })),
      { onlyActivo: true }
    )
    const rows: { gapId: string; label: string; sum: number }[] = []
    for (const [gapId, sum] of wmap) {
      const label =
        enriched.find((e) => e.row.gap_id === gapId)?.gap?.nombre ?? gapId
      rows.push({ gapId, label, sum })
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [enriched])

  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [sortKey, setSortKey] = useState<SortKey>('nombre')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of enriched) {
      const a = e.gap?.area
      if (a) set.add(a)
    }
    return [...set].sort()
  }, [enriched])

  const ownerOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of enriched) {
      const id = e.row.owner_usuario
      if (id) set.add(id)
    }
    return [...set].sort((a, b) => (userById.get(a) ?? a).localeCompare(userById.get(b) ?? b))
  }, [enriched, userById])

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      if (areaFilter !== 'all') {
        const a = e.gap?.area ?? ''
        if (a !== areaFilter) return false
      }
      if (ownerFilter !== 'all') {
        if ((e.row.owner_usuario ?? '') !== ownerFilter) return false
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'sin_datos') {
          if (e.compliance !== null) return false
        } else {
          if (e.status !== statusFilter) return false
        }
      }
      return true
    })
  }, [enriched, areaFilter, ownerFilter, statusFilter])

  /** Misma lógica que la lista, para el grid de semáforo sin segundo fetch. */
  const filteredSemaforoItems = useMemo(() => {
    return metricItems.filter((item) => {
      const gap = item.row.gap_id ? gapById.get(item.row.gap_id) ?? null : null
      if (areaFilter !== 'all') {
        if ((gap?.area ?? '') !== areaFilter) return false
      }
      if (ownerFilter !== 'all') {
        if ((item.row.owner_usuario ?? '') !== ownerFilter) return false
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'sin_datos') {
          if (item.compliance !== null) return false
        } else {
          if (item.status !== statusFilter) return false
        }
      }
      return true
    })
  }, [metricItems, gapById, areaFilter, ownerFilter, statusFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'nombre':
          cmp = a.row.nombre.localeCompare(b.row.nombre, 'es')
          break
        case 'compliance': {
          const ca = a.compliance ?? -1
          const cb = b.compliance ?? -1
          cmp = ca - cb
          break
        }
        case 'weight': {
          const wa = a.row.weight ?? -1
          const wb = b.row.weight ?? -1
          cmp = wa - wb
          break
        }
        case 'area': {
          const aa = a.gap?.area ?? ''
          const ab = b.gap?.area ?? ''
          cmp = aa.localeCompare(ab, 'es')
          break
        }
        case 'status': {
          const rank = (s: KpiComplianceStatus | null) =>
            s === 'on_track' ? 3 : s === 'at_risk' ? 2 : s === 'off_track' ? 1 : 0
          cmp = rank(a.status) - rank(b.status)
          break
        }
        default:
          cmp = 0
      }
      return cmp * dir
    })
    return list
  }, [filtered, sortKey, sortDir])

  const viewModels: KpiCardViewModel[] = useMemo(() => {
    return sorted.map((e) => {
      const gapLabel = e.gap?.nombre ?? null
      const oid = e.row.owner_usuario
      const ownerLabel = oid ? userById.get(oid) ?? oid : null
      const noData = e.compliance === null
      const orphanGap = Boolean(e.row.gap_id && !e.gap)
      const eff = resolveTarget(e.metric, pipelineHorizon)
      const th = resolveEffectiveStatusThresholds(e.metric)
      const thStr = `Semáforo ≥${(th.greenMin * 100).toFixed(0)}% / ≥${(th.yellowMin * 100).toFixed(0)}%`
      const metaLine =
        eff != null && Number.isFinite(eff)
          ? `Meta (${horizonShortLabel(pipelineHorizon)}): ${eff} · ${thStr}`
          : thStr
      return {
        row: e.row,
        gapLabel,
        ownerLabel,
        compliancePct: e.compliance,
        status: e.status,
        weight: e.row.weight,
        trendDelta: e.trendDelta,
        prevCompliancePct: e.prevCompliance,
        noData,
        orphanGap,
        metaLine,
        currentValue: e.metric.current,
        targetValue: eff,
        unit: e.row.unidad,
      }
    })
  }, [sorted, userById, pipelineHorizon])

  const filteredSummary = useMemo(() => {
    let onTrack = 0
    let atRisk = 0
    let offTrack = 0
    let noData = 0

    for (const e of filtered) {
      if (e.compliance == null) {
        noData += 1
        continue
      }
      if (e.status === 'on_track') onTrack += 1
      else if (e.status === 'at_risk') atRisk += 1
      else if (e.status === 'off_track') offTrack += 1
      else noData += 1
    }

    return {
      total: filtered.length,
      onTrack,
      atRisk,
      offTrack,
      noData,
    }
  }, [filtered])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'nombre' || key === 'area' ? 'asc' : 'desc')
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

  const loading = portfolioLoading || gapsLoading
  const hasActiveFilters = areaFilter !== 'all' || ownerFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-8 px-4 py-6 md:px-6">
      <header className="rounded-xl border border-border/70 bg-gradient-to-b from-muted/40 to-background p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">KPIs O2C</h1>
              <InfoHint text="Pantalla ejecutiva para seguimiento de cumplimiento KPI por catálogo O2C, con score global, semáforo y detalle por indicador." />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cumplimiento ponderado por mediciones de catálogo (última medición; coincide con valor actual
              al registrar). Las acciones no actualizan el KPI por medición; solo reflejan avance en gaps.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            <Gauge className="h-4 w-4" />
            Horizonte activo: <span className="font-medium text-foreground">{horizonShortLabel(targetHorizon)}</span>
          </div>
        </div>
      </header>

      {weightWarning && (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          {weightWarning}
        </div>
      )}

      {gapWeightRows.length > 0 && (
        <div
          className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
          role="note"
        >
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">Peso acumulado por gap (referencia)</p>
            <InfoHint text="Referencia analítica para distribución de pesos por gap. No se exige suma de 1 por gap; la validación obligatoria es global del portafolio." />
          </div>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {gapWeightRows.map((g) => (
              <li key={g.gapId}>
                "{g.label}": {g.sum.toFixed(4)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 md:p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Salud global del portafolio</h2>
          <InfoHint text="Incluye score global ponderado y evolución histórica. El score usa pesos activos del portafolio global y cumplimiento por KPI." />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <GlobalScoreWidget score={globalScore} breakdown={portfolioBreakdown} coverage={coverage} />
          <GlobalScoreHistoryChart limit={90} />
        </div>
      </section>

      <section
        className="space-y-4 rounded-xl border border-border/70 bg-card p-4 md:p-5"
        aria-labelledby="kpi-filters-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h2 id="kpi-filters-title" className="text-lg font-medium">
              Filtros y orden
            </h2>
            <InfoHint text="Los filtros afectan simultáneamente semáforo y tarjetas KPI. El orden aplica al listado de detalle." />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAreaFilter('all')
                setOwnerFilter('all')
                setStatusFilter('all')
              }}
              disabled={!hasActiveFilters}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">KPIs visibles</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.total}</p>
          </div>
          <div className="rounded-lg border bg-emerald-500/10 px-3 py-2 text-xs">
            <p className="text-emerald-800 dark:text-emerald-200">En meta</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
              {filteredSummary.onTrack}
            </p>
          </div>
          <div className="rounded-lg border bg-amber-500/10 px-3 py-2 text-xs">
            <p className="text-amber-900 dark:text-amber-200">En riesgo</p>
            <p className="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100">
              {filteredSummary.atRisk}
            </p>
          </div>
          <div className="rounded-lg border bg-destructive/10 px-3 py-2 text-xs">
            <p className="text-destructive">Fuera de meta</p>
            <p className="text-lg font-semibold tabular-nums text-destructive">{filteredSummary.offTrack}</p>
          </div>
          <div className="rounded-lg border bg-muted/50 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Sin datos</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.noData}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="kpi-horizon">Horizonte de meta</Label>
            <Select
              value={targetHorizon}
              onValueChange={(v) => setTargetHorizon(v as TargetHorizon)}
            >
              <SelectTrigger id="kpi-horizon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m6">M6 (con fallback M12 → M18)</SelectItem>
                <SelectItem value="m12">M12 (con fallback M18)</SelectItem>
                <SelectItem value="m18">M18 (por defecto O2C)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kpi-filter-area">Área (gap)</Label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger id="kpi-filter-area">
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
            <Label htmlFor="kpi-filter-owner">Responsable (KPI)</Label>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger id="kpi-filter-owner">
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
            <Label htmlFor="kpi-filter-status">Estado cumplimiento</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as FilterStatus)}
            >
              <SelectTrigger id="kpi-filter-status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="on_track">En meta</SelectItem>
                <SelectItem value="at_risk">En riesgo</SelectItem>
                <SelectItem value="off_track">Fuera de meta</SelectItem>
                <SelectItem value="sin_datos">Sin datos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-5">
            <span className="text-xs text-muted-foreground">Ordenar por:</span>
            <div className="flex flex-wrap gap-2">
              <SortButton k="nombre" label="Nombre" />
              <SortButton k="compliance" label="%" />
              <SortButton k="weight" label="Peso" />
              <SortButton k="area" label="Área" />
              <SortButton k="status" label="Estado" />
            </div>
          </div>
        </div>
      </section>

      <section
        className="space-y-3 rounded-xl border border-border/70 bg-card p-4 md:p-5"
        aria-labelledby="kpi-semaforo-title"
      >
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <h2 id="kpi-semaforo-title" className="text-lg font-medium">
            Semáforo por KPI (catálogo)
          </h2>
          <InfoHint text="Cumplimiento y color de semáforo por KPI; debajo, cuántas acciones operativas están vinculadas a ese KPI (catálogo y tablas puente)." />
        </div>
        <div>
          <p className="mt-1 text-xs text-muted-foreground">
            Umbrales y cumplimiento desde mediciones; impacto operativo = acciones distintas ligadas al KPI.
            Respeta horizonte de meta y los filtros de arriba (sin duplicar peticiones).
          </p>
        </div>
        <CatalogKpiSemaforoGrid
          metricItems={filteredSemaforoItems}
          isLoading={loading}
          emptyMessage="No hay KPIs que coincidan con los filtros."
        />
      </section>

      <section
        className="rounded-xl border border-border/70 bg-card p-4 md:p-5"
        aria-labelledby="kpi-list-title"
      >
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h2 id="kpi-list-title" className="text-lg font-medium">
            Detalle de KPIs ({viewModels.length})
          </h2>
          <InfoHint text="Tarjetas detalladas con cumplimiento, tendencia, peso, gap y responsable para análisis operativo." />
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : viewModels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay KPIs que coincidan con los filtros.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {viewModels.map((vm) => (
              <KpiCard key={vm.row.id} vm={vm} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
