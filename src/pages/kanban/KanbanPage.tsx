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
  useCommentCounts,
  useChecklistProgressByAccionIds,
  KanbanBoard,
  KanbanHeader,
  KanbanToolbar,
  AccionesControlTable,
  CountdownTimer,
  AccionFormDialog,
} from '@/features/operations'
import type { KanbanViewMode } from '@/features/operations'
import { useUsers } from '@/features/users/hooks/useUsers'
import {
  dropdownOptionsByCatalogKeyQueryKey,
  fetchDropdownOptionsByCatalogKey,
} from '@/features/catalogs/hooks/useDropdownOptions'
import type { AccionDiaria } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'
import { todayCDMX } from '@/lib/dateUtils'

const DEFAULT_FILTER: AccionesFilter = {}

export function KanbanPage() {
  const qc = useQueryClient()
  const today = todayCDMX()
  const prefetchEvidenceCatalog = useCallback(async () => {
    await qc.prefetchQuery({
      queryKey: dropdownOptionsByCatalogKeyQueryKey('evidencia_esperada'),
      queryFn: () => fetchDropdownOptionsByCatalogKey('evidencia_esperada'),
    })
  }, [qc])

  useEffect(() => {
    void prefetchEvidenceCatalog()
  }, [prefetchEvidenceCatalog])

  const [filter, setFilter] = useState<AccionesFilter>(() => ({
    ...DEFAULT_FILTER,
    fecha_creacion: today,
  }))
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<KanbanViewMode>('kanban')
  const { data: acciones = [], isLoading } = useAcciones(filter)
  const accionIds = useMemo(() => acciones.map((a) => a.id), [acciones])
  const { data: checklistProgressByAccionId = {} } = useChecklistProgressByAccionIds(accionIds)
  const { data: commentCounts = {} } = useCommentCounts(acciones.map((a) => a.id))
  const { data: users = [] } = useUsers({ activo: true })
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const accionIdFromUrl = searchParams.get('accion')
  const fechaFromUrl = searchParams.get('fecha')
  const { data: accionFromUrl } = useAccion(accionIdFromUrl)

  useEffect(() => {
    if (fechaFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fechaFromUrl)) {
      setFilter((f) => ({ ...f, fecha_creacion: fechaFromUrl }))
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
      const fechaAccion = accionFromUrl.created_at?.slice(0, 10) ?? accionFromUrl.fecha
      if (fechaAccion) setFilter((f) => ({ ...f, fecha_creacion: fechaAccion }))
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
    setFilter({ ...DEFAULT_FILTER, fecha_creacion: today })
  }, [today])

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => {
      map[u.id] = u.nombre
    })
    return map
  }, [users])

  const nextDeadline = useMemo(() => {
    const pending = acciones.filter(
      (a) => a.estado !== 'Hecho' && a.estado !== 'Verificado'
    )
    if (pending.length === 0) return null
    const sorted = [...pending].sort((a, b) => {
      const da = new Date(`${a.fecha}T${a.hora_limite}`).getTime()
      const db = new Date(`${b.fecha}T${b.hora_limite}`).getTime()
      return da - db
    })
    return sorted[0]
  }, [acciones])

  const handleSelectAccion = useCallback((accion: AccionDiaria) => {
    void prefetchEvidenceCatalog()
    setEditingAccion(accion)
    setDialogOpen(true)
  }, [prefetchEvidenceCatalog])

  const handleNewAction = useCallback(() => {
    void prefetchEvidenceCatalog()
    setEditingAccion(null)
    setDialogOpen(true)
  }, [prefetchEvidenceCatalog])

  const handleDialogClose = useCallback(() => {
    setEditingAccion(null)
    setDialogOpen(false)
  }, [])

  return (
    <div id="kanban-page" className="kanban-page flex flex-col gap-6">
      <KanbanHeader
        filtersExpanded={filtersExpanded}
        onToggleFilters={() => setFiltersExpanded((v) => !v)}
        onNewAction={handleNewAction}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        rightOfTitle={
          nextDeadline ? (
            <span id="kanban-next-deadline" className="kanban-next-deadline inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
              Próximo límite
              <CountdownTimer
                fecha={nextDeadline.fecha}
                hora_limite={nextDeadline.hora_limite}
                estado={nextDeadline.estado}
                variant="default"
              />
            </span>
          ) : null
        }
      />

      <div id="kanban-toolbar" className="kanban-toolbar-wrapper">
        <KanbanToolbar
          filter={filter}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          visible={filtersExpanded}
        />
      </div>

      <section id="kanban-content" className="kanban-content min-h-[420px]">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            acciones={acciones}
            isLoading={isLoading}
            responsableNames={responsableNames}
            checklistProgressByAccionId={checklistProgressByAccionId}
            onSelectAccion={handleSelectAccion}
            onNewAction={handleNewAction}
            filterEstado={
              filter.estado != null && !Array.isArray(filter.estado)
                ? filter.estado
                : Array.isArray(filter.estado) && filter.estado.length === 1
                  ? filter.estado[0]
                  : undefined
            }
          />
        ) : (
          <div id="kanban-grid-view" className="kanban-grid-view rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="kanban-grid-view-header border-b border-border/50 bg-muted/20 px-4 py-2.5 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{acciones.length}</span>
                {' '}acciones
              </p>
              <p className="text-xs text-muted-foreground">Clic en una fila para editar</p>
            </div>
            <AccionesControlTable
              acciones={acciones}
              isLoading={isLoading}
              commentCounts={commentCounts}
              onSelectAccion={handleSelectAccion}
              responsableNames={responsableNames}
              checklistProgressByAccionId={checklistProgressByAccionId}
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
        defaultFecha={filter.fecha_creacion ?? today}
        onSuccess={handleDialogClose}
        responsableNames={responsableNames}
      />
    </div>
  )
}
