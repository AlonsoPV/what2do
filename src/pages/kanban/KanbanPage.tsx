/**
 * Kanban — vista rediseñada tipo SaaS/producto moderno.
 * Header premium, toolbar de filtros, tablero con columnas y cards refinadas.
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAcciones,
  useAccion,
  useChecklistProgressByAccionIds,
  KanbanBoard,
  KanbanHeader,
  KanbanToolbar,
  hasKanbanActiveFilters,
  AccionFormDialog,
} from '@/features/operations'
import { useUsers } from '@/features/users/hooks/useUsers'
import {
  dropdownOptionsByCatalogKeyQueryKey,
  fetchDropdownOptionsByCatalogKey,
} from '@/features/catalogs/hooks/useDropdownOptions'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import { useGapAccionesForGapIds } from '@/features/kpi/hooks/useGapAccionesForGapIds'
import { useGap } from '@/features/kpi/hooks/useGaps'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { isAnalystByRole } from '@/features/auth/lib/permissions'

export function KanbanPage() {
  const qc = useQueryClient()
  const today = todayWallClockCDMX()
  const prefetchEvidenceCatalog = useCallback(async () => {
    await qc.prefetchQuery({
      queryKey: dropdownOptionsByCatalogKeyQueryKey('evidencia_esperada'),
      queryFn: () => fetchDropdownOptionsByCatalogKey('evidencia_esperada'),
      staleTime: 10 * 60_000,
    })
  }, [qc])

  const { data: currentUser } = useCurrentUser()
  const isAnalyst = isAnalystByRole(currentUser?.rol)

  const [filter, setFilter] = useState<AccionesFilter>(() => ({}))
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const filterForQuery = useMemo(
    () => (isAnalyst && currentUser?.id ? { ...filter, responsable: currentUser.id } : { ...filter }),
    [currentUser?.id, filter, isAnalyst]
  )
  const {
    data: acciones = [],
    isLoading,
    isError: accionesError,
    error: accionesErrorObj,
    refetch: retryAcciones,
  } = useAcciones(filterForQuery)
  const [searchParams, setSearchParams] = useSearchParams()
  const gapIdFromUrl = searchParams.get('gap')
  const { data: gapAccionesBundle, isLoading: gapAccionesLoading } = useGapAccionesForGapIds(
    gapIdFromUrl ? [gapIdFromUrl] : []
  )
  const { data: gapFromUrl } = useGap(gapIdFromUrl)

  const accionesDisplay = useMemo(() => {
    if (!gapIdFromUrl) return acciones
    if (gapAccionesLoading || !gapAccionesBundle) return []
    const ids = new Set(gapAccionesBundle.acciones.map((a) => a.id))
    return acciones.filter((a) => ids.has(a.id))
  }, [acciones, gapIdFromUrl, gapAccionesBundle, gapAccionesLoading])

  const listLoading = isLoading || Boolean(gapIdFromUrl && gapAccionesLoading)

  const accionIds = useMemo(() => accionesDisplay.map((a) => a.id), [accionesDisplay])
  const { data: checklistProgressByAccionId = {} } = useChecklistProgressByAccionIds(accionIds)
  const { data: users = [] } = useUsers({ activo: true })
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const accionIdFromUrl = searchParams.get('accion')
  const fechaFromUrl = searchParams.get('fecha')
  const { data: accionFromUrl } = useAccion(accionIdFromUrl)

  useEffect(() => {
    if (fechaFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fechaFromUrl)) {
      setFilter((f) => ({ ...f, fecha_min: fechaFromUrl, fecha_max: fechaFromUrl }))
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('fecha')
        return next
      }, { replace: true })
    }
  }, [fechaFromUrl, setSearchParams])

  useEffect(() => {
    if (accionFromUrl && accionIdFromUrl) {
      setEditingAccion(accionFromUrl)
      setDialogOpen(true)
      const fechaAccion = accionFromUrl.fecha
      if (fechaAccion) setFilter((f) => ({ ...f, fecha_min: fechaAccion, fecha_max: fechaAccion }))
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('accion')
        return next
      }, { replace: true })
    }
  }, [accionFromUrl, accionIdFromUrl, setSearchParams])

  const handleFilterChange = useCallback((next: AccionesFilter | Partial<AccionesFilter>) => {
    setFilter((prev) => ({ ...prev, ...next }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilter({})
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('gap')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const clearGapFilter = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('gap')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => {
      map[u.id] = u.nombre
    })
    return map
  }, [users])

  const filterEstadoSingle = useMemo((): ActionStatus | undefined => {
    if (filter.estado != null && !Array.isArray(filter.estado)) return filter.estado
    if (Array.isArray(filter.estado) && filter.estado.length === 1) return filter.estado[0]
    return undefined
  }, [filter.estado])

  const narrowKanbanToOccupiedColumns = useMemo(
    () =>
      filterEstadoSingle == null &&
      ((filter.search != null && filter.search.trim() !== '') ||
        filter.prioridad != null ||
        (filter.area != null && filter.area !== '') ||
        Boolean(gapIdFromUrl)),
    [filterEstadoSingle, filter.search, filter.prioridad, filter.area, gapIdFromUrl]
  )

  const hasActiveFilters = useMemo(() => hasKanbanActiveFilters(filter), [filter])

  const handleSelectAccion = useCallback((accion: AccionDiaria) => {
    void prefetchEvidenceCatalog()
    setEditingAccion(accion)
    setDialogOpen(true)
  }, [prefetchEvidenceCatalog])

  const handleDialogClose = useCallback(() => {
    setEditingAccion(null)
    setDialogOpen(false)
  }, [])

  return (
    <div
      id="kanban-page"
      className="kanban-page mx-auto flex w-full max-w-7xl flex-col space-y-6 overflow-x-hidden px-3 py-5 sm:space-y-8 sm:px-6 sm:py-6"
    >
      <KanbanHeader
        filtersExpanded={filtersExpanded}
        onToggleFilters={isAnalyst ? undefined : () => setFiltersExpanded((v) => !v)}
        hasActiveFilters={hasActiveFilters}
      />

      {gapIdFromUrl ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 text-foreground">
            <span className="font-semibold">Acciones de la brecha: </span>
            <span className="text-muted-foreground">
              {gapFromUrl?.nombre ?? 'Cargando nombre…'}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Solo se listan acciones vinculadas a este problema (fecha del tablero sigue aplicando).
            </span>
          </p>
          <button
            type="button"
            onClick={clearGapFilter}
            className="shrink-0 text-left text-xs font-semibold text-primary underline-offset-4 hover:underline sm:text-sm"
          >
            Quitar filtro de brecha
          </button>
        </div>
      ) : null}

      {filtersExpanded ? (
        <KanbanToolbar
          filter={filter}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          visible
        />
      ) : null}

      <section
        id="kanban-content"
        className="kanban-content min-h-[360px] sm:min-h-[420px]"
      >
        {accionesError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">No se pudieron cargar las acciones.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {accionesErrorObj instanceof Error
                ? accionesErrorObj.message
                : 'Revisa tu conexion o permisos e intenta nuevamente.'}
            </p>
            <button
              type="button"
              onClick={() => void retryAcciones()}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="-mx-3 min-w-0 sm:mx-0">
            <KanbanBoard
              acciones={accionesDisplay}
              isLoading={listLoading}
              responsableNames={responsableNames}
              checklistProgressByAccionId={checklistProgressByAccionId}
              onSelectAccion={handleSelectAccion}
              filterEstado={filterEstadoSingle}
              narrowToOccupiedColumns={narrowKanbanToOccupiedColumns}
            />
          </div>
        )}
      </section>

      <AccionFormDialog
        dialogId="kanban-accion-dialog"
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleDialogClose()
        }}
        accion={editingAccion}
        defaultFecha={filter.fecha_max ?? filter.fecha_min ?? today}
        onSuccess={handleDialogClose}
        responsableNames={responsableNames}
      />
    </div>
  )
}
