/**
 * Barra de filtros tipo toolbar — compacta, elegante, estilo SaaS.
 * Búsqueda, fecha, presets (vista dashboard) y selects avanzados.
 */

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AccionesFilter } from '@/services/acciones.service'
import type { ActionStatus } from '@/types'
import { ACTION_STATUS } from '@/types'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { usePriorities } from '@/features/catalogs/hooks/usePriorities'
import { priorityDisplayLabel } from '../utils/priorityLabels'
import { Label } from '@/components/ui/label'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function KanbanToolbarField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('kanban-toolbar-field flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={htmlFor} className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

const ESTADO_LABELS: Record<string, string> = {
  Pendiente: 'Pendiente',
  Hoy: 'Hoy',
  En_Ejecucion: 'En ejecución',
  Bloqueado: 'Bloqueado',
  Retraso: 'Retraso',
  Hecho: 'Hecho',
  Verificado: 'Verificado',
}

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  ...ACTION_STATUS.map((s) => ({ value: s, label: ESTADO_LABELS[s] ?? s })),
]

const ALL_FILTER_VALUE = 'all'

/** En el trigger: nombre del filtro si está en “todos”; si no, la opción elegida. */
function kanbanFilterTriggerLabel(
  value: string,
  filterLabel: string,
  selectedLabel?: string,
  allValue = ALL_FILTER_VALUE
): string {
  if (value === allValue) return filterLabel
  return selectedLabel ?? filterLabel
}

export type KanbanToolbarLayout = 'default' | 'dashboard'

export interface KanbanToolbarProps {
  filter: AccionesFilter
  /** Puede recibir el filtro completo o solo los campos que cambian (merge con estado actual). */
  onFilterChange: (f: AccionesFilter | Partial<AccionesFilter>) => void
  onClear: () => void
  /** Ocultar completamente (ej. cuando filtros colapsados en Kanban) */
  visible?: boolean
  /** Vista dashboard: primera fila compacta + presets; selects en fila separada según `advancedExpanded`. */
  layout?: KanbanToolbarLayout
  /** Solo `layout="dashboard"`: muestra estado, prioridad, área, creada por y responsable. */
  advancedExpanded?: boolean
  className?: string
}

export function KanbanToolbar({
  filter,
  onFilterChange,
  onClear,
  visible = true,
  layout = 'default',
  advancedExpanded,
  className,
}: KanbanToolbarProps) {
  const { data: users = [] } = useUsers({ activo: true })
  const { data: areas = [] } = useAreas({ activo: true })
  const { data: priorities = [] } = usePriorities({ activo: true })
  const priorityOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: 'Todas las prioridades' },
      ...[...priorities]
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
        .map((p) => ({
          value: p.nombre,
          label: priorityDisplayLabel(p.nombre),
        })),
    ],
    [priorities]
  )

  const hasFilters =
    (filter.search != null && filter.search !== '') ||
    (filter.fecha_min != null && filter.fecha_min !== '') ||
    (filter.fecha_max != null && filter.fecha_max !== '') ||
    filter.estado != null ||
    filter.prioridad != null ||
    (filter.area != null && filter.area !== '') ||
    filter.responsable != null ||
    filter.created_by != null

  const estadoValue = Array.isArray(filter.estado)
    ? (filter.estado[0] ?? 'all')
    : (filter.estado ?? 'all')
  const prioridadValue = Array.isArray(filter.prioridad)
    ? (filter.prioridad[0] ?? 'all')
    : (filter.prioridad ?? 'all')
  const areaValue = filter.area ?? ALL_FILTER_VALUE
  const creadaPorValue = filter.created_by ?? ALL_FILTER_VALUE
  const responsableValue = filter.responsable ?? ALL_FILTER_VALUE

  const showAdvancedRow = layout !== 'dashboard' || advancedExpanded !== false

  const selectTriggerClass =
    'h-10 min-w-0 w-full rounded-lg border-border/60 bg-background text-sm sm:h-9'

  const advancedSelects = (
    <>
      <KanbanToolbarField label="Estado" htmlFor="kanban-filter-estado">
        <Select
          value={estadoValue}
          onValueChange={(v) =>
            onFilterChange({ estado: v === 'all' ? undefined : (v as ActionStatus) })
          }
        >
          <SelectTrigger id="kanban-filter-estado" className={cn('kanban-toolbar-estado', selectTriggerClass)}>
            <SelectValue placeholder="Estado">
              {kanbanFilterTriggerLabel(
                estadoValue,
                'Estado',
                ESTADO_OPTIONS.find((o) => o.value === estadoValue)?.label
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ESTADO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </KanbanToolbarField>
      <KanbanToolbarField label="Prioridad" htmlFor="kanban-filter-prioridad">
        <Select
          value={prioridadValue}
          onValueChange={(v) => onFilterChange({ prioridad: v === 'all' ? undefined : v })}
        >
          <SelectTrigger id="kanban-filter-prioridad" className={cn('kanban-toolbar-prioridad', selectTriggerClass)}>
            <SelectValue placeholder="Prioridad">
              {kanbanFilterTriggerLabel(
                prioridadValue,
                'Prioridad',
                priorityOptions.find((o) => o.value === prioridadValue)?.label
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </KanbanToolbarField>
      <KanbanToolbarField label="Área" htmlFor="kanban-filter-area">
        <Select
          value={areaValue}
          onValueChange={(v) => onFilterChange({ area: v === ALL_FILTER_VALUE ? undefined : v })}
        >
          <SelectTrigger id="kanban-filter-area" className={cn('kanban-toolbar-area', selectTriggerClass)}>
            <SelectValue placeholder="Área">
              {kanbanFilterTriggerLabel(areaValue, 'Área', areaValue !== ALL_FILTER_VALUE ? areaValue : undefined)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todas las áreas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.nombre}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </KanbanToolbarField>
      <KanbanToolbarField label="Creada por" htmlFor="kanban-filter-creada-por">
        <Select
          value={creadaPorValue}
          onValueChange={(v) => onFilterChange({ created_by: v === ALL_FILTER_VALUE ? undefined : v })}
        >
          <SelectTrigger id="kanban-filter-creada-por" className={cn('kanban-toolbar-creada-por', selectTriggerClass)}>
            <SelectValue placeholder="Creada por">
              {kanbanFilterTriggerLabel(
                creadaPorValue,
                'Creada por',
                users.find((u) => u.id === creadaPorValue)?.nombre
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos los creadores</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </KanbanToolbarField>
      <KanbanToolbarField label="Responsable" htmlFor="kanban-filter-responsable">
        <Select
          value={responsableValue}
          onValueChange={(v) => onFilterChange({ responsable: v === ALL_FILTER_VALUE ? undefined : v })}
        >
          <SelectTrigger
            id="kanban-filter-responsable"
            className={cn('kanban-toolbar-responsable', selectTriggerClass)}
          >
            <SelectValue placeholder="Responsable">
              {kanbanFilterTriggerLabel(
                responsableValue,
                'Responsable',
                users.find((u) => u.id === responsableValue)?.nombre
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Todos los responsables</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </KanbanToolbarField>
    </>
  )

  if (!visible) return null

  if (layout !== 'dashboard') {
    return (
      <div
        id="kanban-toolbar"
        className={cn(
          'kanban-toolbar flex min-w-0 flex-col gap-3 rounded-xl border border-border/50 bg-card/80 p-3 shadow-sm sm:p-4',
          'transition-opacity duration-200',
          className
        )}
      >
        <div className="kanban-toolbar-primary grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end lg:gap-2">
          <KanbanToolbarField label="Buscar" htmlFor="kanban-filter-search" className="sm:col-span-2 lg:col-span-1">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="kanban-filter-search"
                className="kanban-toolbar-search h-10 rounded-lg border-border/60 bg-background pl-9 text-sm sm:h-9"
                type="search"
                placeholder="Título, descripción o evidencia…"
                value={filter.search ?? ''}
                onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
              />
            </div>
          </KanbanToolbarField>

          <KanbanToolbarField label="Desde" htmlFor="kanban-filter-fecha-desde">
            <Input
              id="kanban-filter-fecha-desde"
              className="kanban-toolbar-fecha-desde h-10 min-w-0 rounded-lg border-border/60 bg-background text-sm sm:h-9"
              type="date"
              value={filter.fecha_min ?? ''}
              onChange={(e) => onFilterChange({ fecha_min: e.target.value || undefined })}
            />
          </KanbanToolbarField>

          <KanbanToolbarField label="Hasta" htmlFor="kanban-filter-fecha-hasta">
            <Input
              id="kanban-filter-fecha-hasta"
              className="kanban-toolbar-fecha-hasta h-10 min-w-0 rounded-lg border-border/60 bg-background text-sm sm:h-9"
              type="date"
              value={filter.fecha_max ?? ''}
              onChange={(e) => onFilterChange({ fecha_max: e.target.value || undefined })}
            />
          </KanbanToolbarField>

          {hasFilters ? (
            <div className="flex items-end sm:col-span-2 lg:col-span-1 lg:justify-end">
              <Button
                id="kanban-toolbar-clear"
                className="kanban-toolbar-clear h-10 w-full gap-1.5 text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto"
                type="button"
                variant="outline"
                size="sm"
                onClick={onClear}
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </div>

        <div
          className="kanban-toolbar-filters grid min-w-0 gap-2 border-t border-border/40 pt-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
          aria-label="Filtros avanzados"
        >
          {advancedSelects}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'kanban-toolbar-dashboard flex min-w-0 flex-col gap-3',
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <div className="relative min-h-9 min-w-0 flex-1 basis-full sm:min-w-[12rem] sm:max-w-md sm:basis-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="kanban-filter-search"
            className="kanban-toolbar-search h-9 rounded-lg border-border/60 bg-background pl-9 text-sm shadow-sm focus-visible:ring-2"
            type="search"
            placeholder="Buscar por título, descripción o evidencia…"
            value={filter.search ?? ''}
            onChange={(e) =>
              onFilterChange({ search: e.target.value || undefined })
            }
          />
        </div>

        <Input
          id="kanban-filter-fecha-desde"
          className="kanban-toolbar-fecha-desde h-9 min-w-[9rem] shrink-0 rounded-lg border-border/60 bg-background text-sm shadow-sm sm:w-[140px]"
          type="date"
          value={filter.fecha_min ?? ''}
          onChange={(e) => onFilterChange({ fecha_min: e.target.value || undefined })}
          title="Fecha limite desde"
        />
        <Input
          id="kanban-filter-fecha-hasta"
          className="kanban-toolbar-fecha-hasta h-9 min-w-[9rem] shrink-0 rounded-lg border-border/60 bg-background text-sm shadow-sm sm:w-[140px]"
          type="date"
          value={filter.fecha_max ?? ''}
          onChange={(e) => onFilterChange({ fecha_max: e.target.value || undefined })}
          title="Fecha limite hasta"
        />

        {hasFilters && (
          <Button
            id="kanban-toolbar-clear"
            className="kanban-toolbar-clear ml-auto h-9 shrink-0 gap-1.5 text-muted-foreground hover:text-foreground lg:ml-0"
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {showAdvancedRow && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/35 pt-3 sm:gap-2">
          {advancedSelects}
        </div>
      )}
    </div>
  )
}
