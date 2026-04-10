/**
 * Tablero de brechas O2C: cards con progreso por story points y estado del gap.
 */

import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  ListChecks,
  RefreshCw,
  Target,
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
import { GapCard, type GapCardViewModel, type KpiSemaforoCounts } from '../components/GapCard'
import { useCatalogKpiO2cMetricItems, useGapAccionesForGapIds, useGaps } from '../hooks'
import type { CatalogKpiO2cRow, GapStatus } from '../types/kpi.types'
import { computeGapStoryProgress } from '../utils/gapProgress'
import { getGapWeight } from '../utils/kpiCalculations'

type SortKey = 'nombre' | 'progress' | 'status' | 'prioridad'
type SortDir = 'asc' | 'desc'

export function GapsDashboardPage() {
  const { data: gaps = [], isLoading: gapsLoading } = useGaps({ filters: { activo: true } })
  const { kpiRows, metricItems, isLoading: kpisLoading } = useCatalogKpiO2cMetricItems({
    activo: true,
  })
  const gapIds = useMemo(() => gaps.map((g) => g.id), [gaps])
  const { data: accionesData, isLoading: accionesLoading } = useGapAccionesForGapIds(gapIds)
  const acciones = accionesData?.acciones ?? []
  const junctionAccionIdsByGap = accionesData?.junctionAccionIdsByGap ?? new Map<string, Set<string>>()
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

  const baseCards = useMemo((): GapCardViewModel[] => {
    const out = gaps.map((gap) => {
      const junctionSet = junctionAccionIdsByGap.get(gap.id)
      const { donePoints, totalPoints } = computeGapStoryProgress(
        gap.id,
        acciones,
        gap.total_story_points ?? 0,
        junctionSet
      )
      const accionesCount = acciones.filter(
        (a) => a.gap_id === gap.id || junctionSet?.has(a.id)
      ).length
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

      return {
        gap,
        donePoints,
        totalPoints,
        progressPct,
        kpiNames,
        kpiWeightSum,
        kpiSemaforoCounts,
        accionesCount,
        ownerLabel,
        noAccionesWarning: accionesCount === 0,
      }
    })
    if (import.meta.env.DEV && gaps.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Gaps progreso recalculado', { gaps: gaps.length })
    }
    return out
  }, [gaps, acciones, junctionAccionIdsByGap, kpisByGapId, userById, kpiRows, kpiSemaforoByGapId])

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

  const loading = gapsLoading || kpisLoading || accionesLoading
  const hasActiveFilters = areaFilter !== 'all' || ownerFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-8 px-4 py-6 md:px-6">
      <header className="rounded-xl border border-border/70 bg-gradient-to-b from-muted/40 to-background p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Gaps O2C</h1>
              <InfoHint text="Vista de brechas operativas con avance por story points, estado del gap y semáforo agregado de KPIs vinculados." />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Brechas operativas con avance por story points en acciones (Hecho / Verificado), estado de
              la brecha y resumen de semáforo por KPIs de catálogo vinculados.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
            <Target className="h-4 w-4" />
            Gaps visibles: <span className="font-medium text-foreground">{filteredSummary.total}</span>
          </div>
        </div>
      </header>

      <section
        className="space-y-4 rounded-xl border border-border/70 bg-card p-4 md:p-5"
        aria-labelledby="gaps-filters-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h2 id="gaps-filters-title" className="text-lg font-medium">
              Filtros y orden
            </h2>
            <InfoHint text="Los filtros afectan la lista completa de brechas. El orden aplica por nombre, avance, estado o prioridad." />
          </div>
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Brechas</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.total}</p>
          </div>
          <div className="rounded-lg border bg-slate-500/10 px-3 py-2 text-xs">
            <p className="text-slate-700 dark:text-slate-300">Abiertas</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.open}</p>
          </div>
          <div className="rounded-lg border bg-blue-500/10 px-3 py-2 text-xs">
            <p className="text-blue-700 dark:text-blue-300">En curso</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.inProgress}</p>
          </div>
          <div className="rounded-lg border bg-emerald-500/10 px-3 py-2 text-xs">
            <p className="text-emerald-700 dark:text-emerald-300">Resueltas</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.resolved}</p>
          </div>
          <div className="rounded-lg border bg-violet-500/10 px-3 py-2 text-xs">
            <p className="text-violet-700 dark:text-violet-300">Cerradas</p>
            <p className="text-lg font-semibold tabular-nums">{filteredSummary.closed}</p>
          </div>
          <div className="rounded-lg border bg-muted/50 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Avance promedio</p>
            <p className="text-lg font-semibold tabular-nums">
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
      </section>

      <section
        className="rounded-xl border border-border/70 bg-card p-4 md:p-5"
        aria-labelledby="gaps-list-title"
      >
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h2 id="gaps-list-title" className="text-lg font-medium">
            Detalle de brechas ({sorted.length})
          </h2>
          <InfoHint text="Cada tarjeta muestra avance por story points, estado de la brecha, KPIs vinculados y resumen de semáforo." />
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay gaps que coincidan con los filtros.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((vm) => (
              <GapCard key={vm.gap.id} vm={vm} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
