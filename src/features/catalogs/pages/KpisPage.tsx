import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CatalogPageHeader } from '../components/CatalogPageHeader'
import { CatalogStatusBadge } from '../components/CatalogStatusBadge'
import { CatalogFilterBar } from '../components/CatalogFilterBar'
import { CatalogTableLayout } from '../components/CatalogTableLayout'
import { CatalogRowActions } from '../components/CatalogRowActions'
import { ConfirmActivateDialog } from '../components/ConfirmActivateDialog'
import { KpiForm } from '../components/KpiForm'
import { useCreateKpi, useUpdateKpi, useToggleKpiStatus, useKpis } from '../hooks/useKpis'
import { catalogKpisService } from '../services/kpis.service'
import { useGaps } from '@/features/kpi/hooks/useGaps'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { CatalogKpi } from '../types/catalogs.types'
import type { CatalogFilter } from '../types/catalogs.types'
import type { KpiFormValues } from '../schemas/kpi.schema'
import {
  kpiFormValuesToCreateInput,
  kpiFormValuesToUpdateInput,
  catalogKpiToFormValues,
} from '../utils/kpiFormMappers'
import {
  computeGlobalPortfolioWeightSumAfterSave,
  globalPortfolioWeightSumMessage,
} from '../utils/kpiPortfolioWeights'
import { KpiMeasurementDialog } from '@/features/kpi/components/KpiMeasurementDialog'
import { toast } from 'sonner'

const DEFAULT_FILTER: CatalogFilter = {}

export function KpisPage() {
  const [filter, setFilter] = useState<CatalogFilter>(DEFAULT_FILTER)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogKpi | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<CatalogKpi | null>(null)
  const [measurementKpi, setMeasurementKpi] = useState<CatalogKpi | null>(null)

  const { data: items = [], isLoading, isError, error } = useKpis(filter)
  const { data: gaps = [] } = useGaps()
  const { data: users = [] } = useUsers({ activo: true })

  const gapById = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of gaps) m.set(g.id, g.nombre)
    return m
  }, [gaps])

  const gapAreaById = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const g of gaps) m.set(g.id, g.area)
    return m
  }, [gaps])

  const userById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.nombre)
    return m
  }, [users])
  const globalPortfolioSummary = useMemo(() => {
    let activeCount = 0
    let inPortfolioCount = 0
    let weightSum = 0
    for (const row of items) {
      if (row.activo) activeCount++
      if (row.activo && row.gap_id && row.in_global_portfolio) {
        inPortfolioCount++
        if (typeof row.weight === 'number' && Number.isFinite(row.weight)) {
          weightSum += row.weight
        }
      }
    }
    return { activeCount, inPortfolioCount, weightSum }
  }, [items])

  const createM = useCreateKpi()
  const updateM = useUpdateKpi()
  const toggleM = useToggleKpiStatus()

  const handleClearFilters = useCallback(() => setFilter(DEFAULT_FILTER), [])

  const handleCreate = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((row: CatalogKpi) => {
    setEditing(row)
    setFormOpen(true)
  }, [])

  const handleFormSubmit = useCallback(
    async (values: KpiFormValues) => {
      const allRows = await catalogKpisService.list({})
      const patch = {
        id: editing?.id,
        weight: values.weight,
        activo: values.activo,
        gap_id: values.gap_id,
        in_global_portfolio: values.in_global_portfolio,
      }
      const sum = computeGlobalPortfolioWeightSumAfterSave(allRows, patch)
      let hasPortfolio = false
      for (const r of allRows) {
        if (editing && r.id === editing.id) continue
        if (r.activo && r.gap_id && r.in_global_portfolio) hasPortfolio = true
      }
      if (values.activo && values.gap_id && values.in_global_portfolio) hasPortfolio = true

      const wMsg = globalPortfolioWeightSumMessage(sum, hasPortfolio)
      if (wMsg) {
        toast.error(wMsg)
        return
      }

      if (editing) {
        updateM.mutate(
          { id: editing.id, input: kpiFormValuesToUpdateInput(values) },
          {
            onSuccess: () => {
              toast.success('KPI actualizado correctamente')
              setFormOpen(false)
              setEditing(null)
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : 'Error al actualizar'),
          }
        )
      } else {
        createM.mutate(kpiFormValuesToCreateInput(values), {
          onSuccess: () => {
            toast.success('KPI creado correctamente')
            setFormOpen(false)
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al crear'),
        })
      }
    },
    [editing, createM, updateM]
  )

  const confirmToggleStatus = useCallback(async () => {
    if (!confirmToggle) return
    const newActivo = !confirmToggle.activo
    if (newActivo) {
      const allRows = await catalogKpisService.list({})
      const sum = computeGlobalPortfolioWeightSumAfterSave(allRows, {
        id: confirmToggle.id,
        weight: confirmToggle.weight,
        activo: true,
        gap_id: confirmToggle.gap_id,
        in_global_portfolio: confirmToggle.in_global_portfolio,
      })
      let hasPortfolio = false
      for (const r of allRows) {
        if (r.id === confirmToggle.id) continue
        if (r.activo && r.gap_id && r.in_global_portfolio) hasPortfolio = true
      }
      if (confirmToggle.gap_id && confirmToggle.in_global_portfolio) hasPortfolio = true
      const wMsg = globalPortfolioWeightSumMessage(sum, hasPortfolio)
      if (wMsg) {
        toast.error(wMsg)
        return
      }
    }
    toggleM.mutate(
      { id: confirmToggle.id, activo: newActivo },
      {
        onSuccess: () => {
          toast.success(newActivo ? 'KPI activado' : 'KPI desactivado')
          setConfirmToggle(null)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
      }
    )
  }, [confirmToggle, toggleM])

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="KPIs (catálogo O2C)"
        description="Catálogo configurable: gaps, pesos, metas, umbrales y modo de cálculo. Las mediciones reales actualizan cumplimiento."
        onAdd={handleCreate}
        addLabel="Crear KPI"
      />

      <CatalogFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onClear={handleClearFilters}
        searchPlaceholder="Nombre o descripción..."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="min-w-[200px] space-y-2">
          <Label>Gap</Label>
          <Select
            value={filter.gap_id ?? 'all'}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, gap_id: v === 'all' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {gaps.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nombre}{g.activo ? '' : ' (inactivo)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px] space-y-2">
          <Label>Modo cálculo</Label>
          <Select
            value={filter.calc_type ?? 'all'}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                calc_type: v === 'all' ? undefined : (v as CatalogFilter['calc_type']),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="maximize">maximize</SelectItem>
              <SelectItem value="minimize">minimize</SelectItem>
              <SelectItem value="binary">binary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          <p className="text-muted-foreground">KPIs activos</p>
          <p className="text-lg font-semibold tabular-nums">{globalPortfolioSummary.activeCount}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          <p className="text-muted-foreground">Portafolio global activo</p>
          <p className="text-lg font-semibold tabular-nums">{globalPortfolioSummary.inPortfolioCount}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          <p className="text-muted-foreground">Suma de pesos (portfolio)</p>
          <p className="text-lg font-semibold tabular-nums">{globalPortfolioSummary.weightSum.toFixed(4)}</p>
        </div>
      </div>

      <CatalogTableLayout
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error : new Error('Error al cargar')) : null}
        emptyTitle="No hay KPIs"
        emptyDescription="Crea el primer KPI o ajusta los filtros."
        itemCount={items.length}
      >
        <>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Gap</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Cálculo</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Responsable KPI</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Periodicidad</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[200px] font-medium">
                  <span className="line-clamp-2">{row.nombre}</span>
                </TableCell>
                <TableCell>
                  {row.gap_id ? (
                    <Badge variant="outline">{gapById.get(row.gap_id) ?? row.gap_id}</Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                  {row.gap_id ? (gapAreaById.get(row.gap_id) ?? '—') : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.calc_type ?? row.direction ?? '—'}</Badge>
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.weight != null && Number.isFinite(row.weight)
                    ? `${(row.weight * 100).toFixed(2)}% (${row.weight.toFixed(4)})`
                    : '—'}
                </TableCell>
                <TableCell>
                  {row.in_global_portfolio ? (
                    <Badge variant="default">Sí</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-xs">
                  {row.owner_usuario ? userById.get(row.owner_usuario) ?? row.owner_usuario : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.unidad}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{row.periodicidad}</Badge>
                </TableCell>
                <TableCell>
                  <CatalogStatusBadge activo={row.activo} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <CatalogRowActions
                      item={row}
                      onEdit={handleEdit}
                      onToggleActivo={setConfirmToggle}
                      resourceLabel="KPI"
                    />
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => setMeasurementKpi(row)}
                    >
                      Medición
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </>
      </CatalogTableLayout>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar KPI' : 'Nuevo KPI'}</DialogTitle>
          </DialogHeader>
          <KpiForm
            key={editing?.id ?? 'new'}
            defaultValues={editing ? catalogKpiToFormValues(editing) : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
            isSubmitting={createM.isPending || updateM.isPending}
          />
        </DialogContent>
      </Dialog>

      <KpiMeasurementDialog
        kpi={measurementKpi}
        open={!!measurementKpi}
        onOpenChange={(o) => !o && setMeasurementKpi(null)}
      />

      <ConfirmActivateDialog
        open={!!confirmToggle}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle?.activo ? 'Desactivar KPI' : 'Activar KPI'}
        description={
          confirmToggle
            ? confirmToggle.activo
              ? `¿Desactivar "${confirmToggle.nombre}"?`
              : `¿Activar "${confirmToggle.nombre}"?`
            : ''
        }
        onConfirm={confirmToggleStatus}
        isActivo={confirmToggle?.activo ?? false}
        itemName={confirmToggle?.nombre ?? ''}
        isLoading={toggleM.isPending}
      />
    </div>
  )
}
