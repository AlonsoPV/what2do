import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, Download, Filter, RefreshCw } from 'lucide-react'
import { ROUTES } from '@/constants'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { canAccessRouteByRole, getDefaultRouteByRole } from '@/features/auth/lib/permissions'
import { getAppNow } from '@/lib/clock'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { InfoHint } from '@/components/InfoHint'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useImpactMatrix, type ImpactRow } from '../hooks/useImpactMatrix'
import { buildImpactMatrixCsv, downloadImpactMatrixCsv } from '../utils/exportImpactMatrixCsv'

function formatPercentFromFraction(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

function actionStatusDotClass(status: string | null): string {
  if (status === 'Completada') return 'bg-emerald-500'
  if (status === 'Retrasa') return 'bg-red-500'
  if (status === 'En_Proceso') return 'bg-amber-500'
  return 'bg-muted-foreground/40'
}

function ImpactTable({
  rows,
  emptyLabel,
}: {
  rows: ImpactRow[]
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Titulo</TableHead>
          <TableHead>GAP</TableHead>
          <TableHead className="w-20">Pts</TableHead>
          <TableHead>KPI</TableHead>
          <TableHead className="w-24">Peso KPI</TableHead>
          <TableHead className="w-24">Impacto</TableHead>
          <TableHead className="w-28">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={row.accionId}>
            <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
            <TableCell className="max-w-[18rem]">
              <div className="truncate font-medium text-foreground" title={row.titulo}>
                {row.titulo}
              </div>
            </TableCell>
            <TableCell>{row.gapNombre ?? '—'}</TableCell>
            <TableCell className="tabular-nums">{formatNumber(row.storyPoints, 0)}</TableCell>
            <TableCell>{row.kpiNombre ?? '—'}</TableCell>
            <TableCell className="tabular-nums">
              {row.pesoKpi != null ? `${(row.pesoKpi * 100).toFixed(1)}%` : '—'}
            </TableCell>
            <TableCell className="tabular-nums font-medium">
              {formatPercentFromFraction(row.impactoPct)}
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1 text-xs text-foreground shadow-sm">
                <span
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', actionStatusDotClass(row.estado))}
                  aria-hidden
                />
                {row.estado ?? '—'}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ImpactMatrixPage() {
  const { data: currentUser } = useCurrentUser()
  const canAccess = canAccessRouteByRole(currentUser?.rol, ROUTES.DASHBOARD_IMPACTO)
  const { rows, gapSummary, top10, impactoTotal, isLoading } = useImpactMatrix({ enabled: canAccess })

  if (!canAccess) {
    return <Navigate to={getDefaultRouteByRole(currentUser?.rol)} replace />
  }
  const [gapFilter, setGapFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const gapOptions = useMemo(() => {
    return [...new Set(rows.map((r) => r.gapNombre).filter((v): v is string => Boolean(v)))].sort((a, b) =>
      a.localeCompare(b, 'es')
    )
  }, [rows])

  const statusOptions = useMemo(() => {
    return [...new Set(rows.map((r) => r.estado).filter((v): v is string => Boolean(v)))].sort((a, b) =>
      a.localeCompare(b, 'es')
    )
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es')
    return rows.filter((r) => {
      if (gapFilter !== 'all' && (r.gapNombre ?? '') !== gapFilter) return false
      if (statusFilter !== 'all' && (r.estado ?? '') !== statusFilter) return false
      if (
        q &&
        !`${r.titulo} ${r.gapNombre ?? ''} ${r.kpiNombre ?? ''}`.toLocaleLowerCase('es').includes(q)
      ) {
        return false
      }
      return true
    })
  }, [rows, gapFilter, search, statusFilter])

  const handleExportCsv = () => {
    const csv = buildImpactMatrixCsv(filteredRows)
    downloadImpactMatrixCsv(csv, `impact-matrix-${getAppNow().toISOString().slice(0, 10)}.csv`)
  }

  const hasActiveFilters = gapFilter !== 'all' || statusFilter !== 'all' || search.trim() !== ''

  return (
    <div
      data-page="impact-matrix-dashboard"
      className="impact-matrix-dashboard mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6"
    >
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Priorización O2C
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Matriz de impacto</h1>
              <InfoHint text="El impacto refleja esfuerzo relativo distribuido por gap y peso KPI. Completar una acción no sube automáticamente el KPI; el KPI mejora cuando el proceso mejora operativamente." />
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Impacto calculado como{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                (Peso KPI × Story Points acción) / Total puntos GAP
              </code>
              . Fuente: acciones con story points vinculadas a gaps y KPIs de catálogo.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
            Acciones con cobertura:{' '}
            <span className="font-medium tabular-nums text-foreground">{rows.length}</span>
          </div>
        </div>
      </header>

      <section className="scroll-mt-4">
        <SectionCard>
          <SectionCardHeader
            icon={BarChart3}
            title="Resumen ejecutivo"
            subtitle="Totales ponderados sobre acciones con story points y gaps cubiertos."
          />
          <SectionCardBody>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Impacto total cubierto
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {formatPercentFromFraction(impactoTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Acciones con story points
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{rows.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GAPs con cobertura
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{gapSummary.length}</p>
              </div>
            </div>
          </SectionCardBody>
        </SectionCard>
      </section>

      <section className="scroll-mt-4">
        <SectionCard>
          <SectionCardHeader
            icon={BarChart3}
            title="Resumen por GAP"
            subtitle="Impacto acumulado por gap a partir de acciones con story points vinculadas."
            action={
              <InfoHint text="Impacto acumulado por gap a partir de las acciones con story points vinculadas al mismo gap." />
            }
          />
          <SectionCardBody>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : gapSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay gaps con cobertura de story points.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GAP</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                    <TableHead className="w-28">Puntos totales</TableHead>
                    <TableHead className="w-28">Impacto acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gapSummary.map((row) => (
                    <TableRow key={row.gapId}>
                      <TableCell className="font-medium">{row.gapNombre}</TableCell>
                      <TableCell className="tabular-nums">{row.accionCount}</TableCell>
                      <TableCell className="tabular-nums">{formatNumber(row.totalPts, 1)}</TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatPercentFromFraction(row.impactoTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCardBody>
        </SectionCard>
      </section>

      <section className="scroll-mt-4">
        <SectionCard>
          <SectionCardHeader
            icon={BarChart3}
            title="Top 10 acciones de mayor impacto"
            subtitle="Ranking por impacto estimado al score global O2C."
          />
          <SectionCardBody>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <ImpactTable rows={top10} emptyLabel="No hay acciones elegibles para calcular impacto." />
            )}
          </SectionCardBody>
        </SectionCard>
      </section>

      <section data-section="filters" className="scroll-mt-4">
        <SectionCard>
          <SectionCardHeader
            icon={Filter}
            title="Matriz completa"
            subtitle="Filtra por gap, estado o texto; el CSV respeta la vista actual."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <InfoHint text="Filtra la matriz por gap, estado o texto del título. El export CSV respeta la vista filtrada actual." />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={filteredRows.length === 0}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Exportar CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGapFilter('all')
                    setStatusFilter('all')
                    setSearch('')
                  }}
                  disabled={!hasActiveFilters}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Limpiar filtros
                </Button>
              </div>
            }
          />
          <SectionCardBody className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="impact-gap-filter">GAP</Label>
                <Select value={gapFilter} onValueChange={setGapFilter}>
                  <SelectTrigger id="impact-gap-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {gapOptions.map((gap) => (
                      <SelectItem key={gap} value={gap}>
                        {gap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact-status-filter">Estado de acción</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="impact-status-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact-search">Búsqueda por título</Label>
                <Input
                  id="impact-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar acción, gap o KPI"
                />
              </div>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <ImpactTable rows={filteredRows} emptyLabel="No hay filas que coincidan con los filtros." />
            )}
          </SectionCardBody>
        </SectionCard>
      </section>
    </div>
  )
}
