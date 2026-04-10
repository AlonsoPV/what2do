import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { CatalogPageHeader } from '../components/CatalogPageHeader'
import { CatalogStatusBadge } from '../components/CatalogStatusBadge'
import { CatalogFilterBar } from '../components/CatalogFilterBar'
import { CatalogTableLayout } from '../components/CatalogTableLayout'
import { CatalogRowActions } from '../components/CatalogRowActions'
import { ConfirmActivateDialog } from '../components/ConfirmActivateDialog'
import { GapForm } from '../components/GapForm'
import { useCreateGap, useToggleGapStatus, useUpdateGap } from '../hooks/useGapsCatalog'
import type { CatalogFilter } from '../types/catalogs.types'
import type { GapFormInputValues, GapFormValues } from '../schemas/gap.schema'
import { useGaps } from '@/features/kpi/hooks/useGaps'
import type { Gap } from '@/features/kpi/types/kpi.types'
import { ROUTES } from '@/constants'
import { toast } from 'sonner'

const DEFAULT_FILTER: CatalogFilter = {}

function gapStatusBadgeVariant(
  s: Gap['status']
): 'default' | 'secondary' | 'outline' | 'success' | 'muted' {
  switch (s) {
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

function gapStatusLabel(s: Gap['status']): string {
  switch (s) {
    case 'open':
      return 'Abierto'
    case 'in_progress':
      return 'En curso'
    case 'resolved':
      return 'Resuelto'
    case 'closed':
      return 'Cerrado'
    default:
      return s
  }
}

function gapToFormInput(g: Gap): GapFormInputValues {
  return {
    nombre: g.nombre,
    descripcion: g.descripcion ?? undefined,
    prioridad: g.prioridad ?? undefined,
    status: g.status,
    area: g.area ?? undefined,
    owner_usuario: g.owner_usuario ?? '__none__',
    total_story_points: g.total_story_points,
    activo: g.activo,
  }
}

export function GapsPage() {
  const [filter, setFilter] = useState<CatalogFilter>(DEFAULT_FILTER)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Gap | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Gap | null>(null)

  const listFilters = useMemo(() => {
    const f: { activo?: boolean } = {}
    if (filter.activo === true) f.activo = true
    if (filter.activo === false) f.activo = false
    return f
  }, [filter.activo])

  const { data: gaps = [], isLoading, isError, error } = useGaps({ filters: listFilters })

  const items = useMemo(() => {
    const q = filter.search?.trim().toLowerCase()
    if (!q) return gaps
    return gaps.filter(
      (g) =>
        g.nombre.toLowerCase().includes(q) ||
        (g.descripcion?.toLowerCase().includes(q) ?? false)
    )
  }, [gaps, filter.search])

  const createM = useCreateGap()
  const updateM = useUpdateGap()
  const toggleM = useToggleGapStatus()

  const handleClearFilters = useCallback(() => setFilter(DEFAULT_FILTER), [])

  const handleCreate = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((row: Gap) => {
    setEditing(row)
    setFormOpen(true)
  }, [])

  const handleFormSubmit = useCallback(
    (values: GapFormValues) => {
      const payload = {
        nombre: values.nombre,
        descripcion: values.descripcion ?? null,
        prioridad: values.prioridad,
        status: values.status,
        area: values.area,
        owner_usuario: values.owner_usuario,
        total_story_points: values.total_story_points,
        activo: values.activo,
      }
      if (editing) {
        updateM.mutate(
          { id: editing.id, input: payload },
          {
            onSuccess: () => {
              toast.success('Brecha actualizada correctamente')
              setFormOpen(false)
              setEditing(null)
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : 'Error al actualizar'),
          }
        )
      } else {
        createM.mutate(payload, {
          onSuccess: () => {
            toast.success('Brecha creada correctamente')
            setFormOpen(false)
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al crear'),
        })
      }
    },
    [editing, updateM, createM]
  )

  const confirmToggleStatus = useCallback(() => {
    if (!confirmToggle) return
    const newActivo = !confirmToggle.activo
    toggleM.mutate(
      { id: confirmToggle.id, activo: newActivo },
      {
        onSuccess: () => {
          toast.success(newActivo ? 'Brecha activada' : 'Brecha desactivada')
          setConfirmToggle(null)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
      }
    )
  }, [confirmToggle, toggleM])

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Brechas O2C (gaps)"
        description={
          <>
            Define y mantiene brechas operativas vinculables a KPIs y acciones. Vista de seguimiento:{' '}
            <Link to={ROUTES.DASHBOARD_GAPS} className="text-primary underline underline-offset-4">
              Dashboard Gaps
            </Link>
            .
          </>
        }
        onAdd={handleCreate}
        addLabel="Crear brecha"
      />

      <CatalogFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onClear={handleClearFilters}
        searchPlaceholder="Nombre o descripción…"
      />

      <CatalogTableLayout
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error : new Error('Error al cargar')) : null}
        emptyTitle="No hay brechas"
        emptyDescription="Crea la primera brecha o ajusta los filtros."
        itemCount={items.length}
      >
        <>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Story pts (ref.)</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.nombre}</div>
                  {row.descripcion && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{row.descripcion}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.area ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={gapStatusBadgeVariant(row.status)}>{gapStatusLabel(row.status)}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.total_story_points != null ? row.total_story_points : '—'}
                </TableCell>
                <TableCell>
                  <CatalogStatusBadge activo={row.activo} />
                </TableCell>
                <TableCell>
                  <CatalogRowActions
                    item={row}
                    onEdit={handleEdit}
                    onToggleActivo={setConfirmToggle}
                    resourceLabel="brecha"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </>
      </CatalogTableLayout>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar brecha' : 'Nueva brecha'}</DialogTitle>
          </DialogHeader>
          <GapForm
            key={editing?.id ?? 'new'}
            defaultValues={editing ? gapToFormInput(editing) : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
            isSubmitting={createM.isPending || updateM.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmActivateDialog
        open={!!confirmToggle}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle?.activo ? 'Desactivar brecha' : 'Activar brecha'}
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
