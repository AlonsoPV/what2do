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

const DASHBOARD_FILTER_FIELD =
  'h-11 min-h-11 w-full min-w-0 rounded-lg border-2 border-border bg-card text-[11px] font-medium shadow-sm sm:h-10 sm:min-h-10 sm:text-sm'

const DASHBOARD_FILTER_FIELD_ACTIVE =
  'border-primary/50 bg-primary/5 ring-2 ring-primary/15'

/** Dropdown amplio y desplazable para ver nombres completos en filtros Kanban. */
const KANBAN_FILTER_SELECT_CONTENT_CLASS =
  'z-[200] max-h-[min(18rem,72dvh)] min-w-[var(--radix-select-trigger-width)] [&>*:nth-child(2)]:!h-auto [&>*:nth-child(2)]:max-h-[min(17rem,68dvh)]'

export function createKanbanDefaultFilter(userId?: string): AccionesFilter {
  return userId ? { responsable: userId } : {}
}

export function hasKanbanActiveFilters(filter: AccionesFilter): boolean {
  return (
    (filter.search != null && filter.search.trim() !== '') ||
    (filter.fecha_min != null && filter.fecha_min !== '') ||
    (filter.fecha_max != null && filter.fecha_max !== '') ||
    filter.estado != null ||
    filter.prioridad != null ||
    (filter.area != null && filter.area !== '') ||
    filter.responsable != null ||
    filter.created_by != null
  )
}

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

  const hasFilters = hasKanbanActiveFilters(filter)

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
    layout === 'dashboard'
      ? cn(
          DASHBOARD_FILTER_FIELD,
          '[&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left [&>span]:text-[11px] sm:[&>span]:text-sm'
        )
      : 'h-auto min-h-10 min-w-0 w-full rounded-lg border-border/60 bg-background py-2 text-sm sm:min-h-9 [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left'

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
          <SelectContent className={KANBAN_FILTER_SELECT_CONTENT_CLASS} position="popper">
            {ESTADO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="whitespace-normal">
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
          <SelectContent className={KANBAN_FILTER_SELECT_CONTENT_CLASS} position="popper">
            {priorityOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="whitespace-normal">
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
          <SelectContent className={KANBAN_FILTER_SELECT_CONTENT_CLASS} position="popper">
            <SelectItem value={ALL_FILTER_VALUE} className="whitespace-normal">
              Todas las áreas
            </SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.nombre} className="whitespace-normal">
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
          <SelectContent className={KANBAN_FILTER_SELECT_CONTENT_CLASS} position="popper">
            <SelectItem value={ALL_FILTER_VALUE} className="whitespace-normal">
              Todos los creadores
            </SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id} className="whitespace-normal">
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
          <SelectContent className={KANBAN_FILTER_SELECT_CONTENT_CLASS} position="popper">
            <SelectItem value={ALL_FILTER_VALUE} className="whitespace-normal">
              Todos los responsables
            </SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id} className="whitespace-normal">
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
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <p className="text-xs font-semibold text-foreground sm:text-sm">Refinar resultados</p>
        {hasFilters ? (
          <Button
            id="kanban-toolbar-clear"
            className="h-8 shrink-0 gap-1.5 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground sm:h-9 sm:text-xs"
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5 shrink-0" />
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-3 gap-2">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="kanban-filter-search"
            className={cn(
              DASHBOARD_FILTER_FIELD,
              'pl-8 sm:pl-9',
              filter.search?.trim() && DASHBOARD_FILTER_FIELD_ACTIVE
            )}
            type="search"
            placeholder="Buscar"
            value={filter.search ?? ''}
            onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
          />
        </div>

        <Input
          id="kanban-filter-fecha-desde"
          className={cn(DASHBOARD_FILTER_FIELD, filter.fecha_min && DASHBOARD_FILTER_FIELD_ACTIVE)}
          type="date"
          value={filter.fecha_min ?? ''}
          onChange={(e) => onFilterChange({ fecha_min: e.target.value || undefined })}
          title="Fecha límite desde"
        />
        <Input
          id="kanban-filter-fecha-hasta"
          className={cn(DASHBOARD_FILTER_FIELD, filter.fecha_max && DASHBOARD_FILTER_FIELD_ACTIVE)}
          type="date"
          value={filter.fecha_max ?? ''}
          onChange={(e) => onFilterChange({ fecha_max: e.target.value || undefined })}
          title="Fecha límite hasta"
        />
      </div>

      {showAdvancedRow ? (
        <div
          className="grid min-w-0 grid-cols-2 gap-2 border-t border-border/35 pt-3 sm:grid-cols-3 lg:grid-cols-5"
          aria-label="Filtros avanzados"
        >
          {advancedSelects}
        </div>
      ) : null}
    </div>
  )
}
