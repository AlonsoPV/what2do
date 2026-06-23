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
import { useStatuses } from '@/features/catalogs/hooks/useStatuses'
import { priorityDisplayLabel } from '../utils/priorityLabels'
import { statusCatalogByKey, statusCatalogLabel } from '../utils/statusCatalog'
import { Label } from '@/components/ui/label'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const FILTER_FIELD_ACTIVE =
  'border-primary/55 bg-primary/[0.06] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.1)] ring-2 ring-primary/15'

const FILTER_LABEL_ACTIVE = 'font-semibold text-primary'

function KanbanToolbarField({
  label,
  htmlFor,
  children,
  className,
  active = false,
  compact = false,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
  className?: string
  active?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'kanban-toolbar-field flex min-w-0 flex-col',
        compact ? 'gap-0.5' : 'gap-1',
        active && 'kanban-toolbar-field--active',
        className
      )}
    >
      <Label
        htmlFor={htmlFor}
        className={cn(
          'flex items-center gap-1.5 font-medium text-muted-foreground',
          compact ? 'sr-only' : 'text-[11px]',
          !compact && active && FILTER_LABEL_ACTIVE
        )}
      >
        {active && !compact ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25)]"
            aria-hidden
          />
        ) : null}
        {label}
        {active ? <span className="sr-only"> (filtro activo)</span> : null}
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

const DEFAULT_FILTER_INPUT_CLASS =
  'h-9 min-w-0 rounded-md border-border/60 bg-background text-sm transition-[box-shadow,border-color,background-color]'

const DEFAULT_FILTER_SELECT_CLASS =
  'h-9 min-h-9 min-w-0 w-full rounded-md border-border/60 bg-background px-2.5 py-0 text-sm transition-[box-shadow,border-color,background-color] [&>span]:line-clamp-1 [&>span]:truncate [&>span]:text-left'

/** Dropdown amplio y desplazable para ver nombres completos en filtros Kanban. */
const KANBAN_FILTER_SELECT_CONTENT_CLASS =
  'z-[200] max-h-[min(18rem,72dvh)] min-w-[var(--radix-select-trigger-width)] [&>*:nth-child(2)]:!h-auto [&>*:nth-child(2)]:max-h-[min(17rem,68dvh)]'

export function createKanbanDefaultFilter(): AccionesFilter {
  return {}
}

export function hasKanbanActiveFilters(filter: AccionesFilter): boolean {
  return countKanbanActiveFilters(filter) > 0
}

export function countKanbanActiveFilters(filter: AccionesFilter): number {
  let count = 0
  if (filter.search != null && filter.search.trim() !== '') count++
  if (filter.fecha_min != null && filter.fecha_min !== '') count++
  if (filter.fecha_max != null && filter.fecha_max !== '') count++
  if (filter.estado != null) count++
  if (filter.prioridad != null || filter.prioridad_id != null) count++
  if (filter.area != null && filter.area !== '') count++
  if (filter.responsable != null) count++
  if (filter.created_by != null) count++
  return count
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
  const { data: statuses = [] } = useStatuses()
  const statusByKey = useMemo(() => statusCatalogByKey(statuses), [statuses])
  const estadoOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: 'Todos los estados' },
      ...ACTION_STATUS.map((s) => ({
        value: s,
        label: statusCatalogLabel(s, statusByKey) || ESTADO_OPTIONS.find((o) => o.value === s)?.label || s,
      })),
    ],
    [statusByKey]
  )
  const priorityOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: 'Todas las prioridades' },
      ...[...priorities]
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
        .map((p) => ({
          value: p.id,
          label: priorityDisplayLabel(p.nombre),
        })),
    ],
    [priorities]
  )

  const hasFilters = hasKanbanActiveFilters(filter)
  const activeFilterCount = countKanbanActiveFilters(filter)

  const estadoValue = Array.isArray(filter.estado)
    ? (filter.estado[0] ?? 'all')
    : (filter.estado ?? 'all')
  const prioridadValue = Array.isArray(filter.prioridad_id)
    ? (filter.prioridad_id[0] ?? 'all')
    : (filter.prioridad_id ?? (Array.isArray(filter.prioridad) ? (filter.prioridad[0] ?? 'all') : (filter.prioridad ?? 'all')))
  const areaValue = filter.area ?? ALL_FILTER_VALUE
  const creadaPorValue = filter.created_by ?? ALL_FILTER_VALUE
  const responsableValue = filter.responsable ?? ALL_FILTER_VALUE

  const estadoActive = estadoValue !== ALL_FILTER_VALUE
  const prioridadActive = prioridadValue !== ALL_FILTER_VALUE
  const areaActive = areaValue !== ALL_FILTER_VALUE
  const creadaPorActive = creadaPorValue !== ALL_FILTER_VALUE
  const responsableActive = responsableValue !== ALL_FILTER_VALUE
  const searchActive = Boolean(filter.search?.trim())
  const fechaDesdeActive = Boolean(filter.fecha_min)
  const fechaHastaActive = Boolean(filter.fecha_max)

  const showAdvancedRow = layout !== 'dashboard' || advancedExpanded !== false

  const selectTriggerClass = (active = false) =>
    layout === 'dashboard'
      ? cn(
          DASHBOARD_FILTER_FIELD,
          '[&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left [&>span]:text-[11px] sm:[&>span]:text-sm',
          active && DASHBOARD_FILTER_FIELD_ACTIVE
        )
      : cn(DEFAULT_FILTER_SELECT_CLASS, active && FILTER_FIELD_ACTIVE)

  const inputFieldClass = (active = false) =>
    layout === 'dashboard'
      ? cn(DASHBOARD_FILTER_FIELD, active && DASHBOARD_FILTER_FIELD_ACTIVE)
      : cn(DEFAULT_FILTER_INPUT_CLASS, active && FILTER_FIELD_ACTIVE)

  const advancedSelects = (compact = false) => (
    <>
      <KanbanToolbarField label="Estado" htmlFor="kanban-filter-estado" active={estadoActive} compact={compact}>
        <Select
          value={estadoValue}
          onValueChange={(v) =>
            onFilterChange({ estado: v === 'all' ? undefined : (v as ActionStatus) })
          }
        >
          <SelectTrigger id="kanban-filter-estado" className={cn('kanban-toolbar-estado', selectTriggerClass(estadoActive))}>
            <SelectValue placeholder="Estado">
              {kanbanFilterTriggerLabel(
                estadoValue,
                'Estado',
                estadoOptions.find((o) => o.value === estadoValue)?.label
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={KANBAN_FILTER_SELECT_CONTENT_CLASS} position="popper">
            {estadoOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="whitespace-normal">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </KanbanToolbarField>
      <KanbanToolbarField label="Prioridad" htmlFor="kanban-filter-prioridad" active={prioridadActive} compact={compact}>
        <Select
          value={prioridadValue}
          onValueChange={(v) => {
            const priority = priorities.find((p) => p.id === v)
            onFilterChange({
              prioridad_id: v === 'all' ? undefined : v,
              prioridad: v === 'all' ? undefined : (priority?.nombre ?? undefined),
            })
          }}
        >
          <SelectTrigger id="kanban-filter-prioridad" className={cn('kanban-toolbar-prioridad', selectTriggerClass(prioridadActive))}>
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
      <KanbanToolbarField label="Área" htmlFor="kanban-filter-area" active={areaActive} compact={compact}>
        <Select
          value={areaValue}
          onValueChange={(v) => onFilterChange({ area: v === ALL_FILTER_VALUE ? undefined : v })}
        >
          <SelectTrigger id="kanban-filter-area" className={cn('kanban-toolbar-area', selectTriggerClass(areaActive))}>
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
      <KanbanToolbarField label="Creada por" htmlFor="kanban-filter-creada-por" active={creadaPorActive} compact={compact}>
        <Select
          value={creadaPorValue}
          onValueChange={(v) => onFilterChange({ created_by: v === ALL_FILTER_VALUE ? undefined : v })}
        >
          <SelectTrigger id="kanban-filter-creada-por" className={cn('kanban-toolbar-creada-por', selectTriggerClass(creadaPorActive))}>
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
      <KanbanToolbarField label="Responsable" htmlFor="kanban-filter-responsable" active={responsableActive} compact={compact}>
        <Select
          value={responsableValue}
          onValueChange={(v) => onFilterChange({ responsable: v === ALL_FILTER_VALUE ? undefined : v })}
        >
          <SelectTrigger
            id="kanban-filter-responsable"
            className={cn('kanban-toolbar-responsable', selectTriggerClass(responsableActive))}
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
          'kanban-toolbar flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-gradient-to-b from-card via-card to-muted/20 p-2.5 shadow-sm sm:gap-2.5 sm:p-3',
          hasFilters && 'border-primary/25 shadow-[0_1px_0_0_hsl(var(--primary)/0.08)]',
          'transition-[border-color,box-shadow] duration-200',
          className
        )}
      >
        {/* Fila 1: búsqueda, fechas y acciones */}
        <div
          className="kanban-toolbar-row-primary grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_7.25rem_7.25rem_auto] lg:items-center"
          role="group"
          aria-label="Búsqueda y rango de fechas"
        >
          <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1 lg:block">
            <div className="relative min-w-0 flex-1 lg:w-full">
              <Search
                className={cn(
                  'pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                  searchActive ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-hidden
              />
              <Input
                id="kanban-filter-search"
                className={cn('kanban-toolbar-search h-9 w-full pl-8', inputFieldClass(searchActive))}
                type="search"
                placeholder="Buscar acciones…"
                value={filter.search ?? ''}
                onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
                aria-label="Buscar por título, descripción o evidencia"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
              {activeFilterCount > 0 ? (
                <span
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 text-[11px] font-semibold text-primary"
                  aria-label={`${activeFilterCount} filtros activos`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="tabular-nums">{activeFilterCount}</span>
                </span>
              ) : null}
              {hasFilters ? (
                <Button
                  id="kanban-toolbar-clear"
                  className="kanban-toolbar-clear h-9 shrink-0 border-primary/25 bg-primary/5 px-2 text-primary hover:bg-primary/10 hover:text-primary"
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClear}
                  aria-label="Limpiar filtros"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                </Button>
              ) : null}
            </div>
          </div>

          <Input
            id="kanban-filter-fecha-desde"
            className={cn('kanban-toolbar-fecha-desde min-w-0', inputFieldClass(fechaDesdeActive))}
            type="date"
            value={filter.fecha_min ?? ''}
            onChange={(e) => onFilterChange({ fecha_min: e.target.value || undefined })}
            aria-label="Fecha límite desde"
            title="Desde"
          />

          <Input
            id="kanban-filter-fecha-hasta"
            className={cn('kanban-toolbar-fecha-hasta min-w-0', inputFieldClass(fechaHastaActive))}
            type="date"
            value={filter.fecha_max ?? ''}
            onChange={(e) => onFilterChange({ fecha_max: e.target.value || undefined })}
            aria-label="Fecha límite hasta"
            title="Hasta"
          />

          <div className="hidden items-center justify-end gap-1.5 lg:flex">
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 text-[11px] font-semibold text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {activeFilterCount} activo{activeFilterCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Filtros
              </span>
            )}
            {hasFilters ? (
              <Button
                className="h-9 shrink-0 gap-1 border-primary/25 bg-primary/5 px-2.5 text-primary hover:bg-primary/10 hover:text-primary"
                type="button"
                variant="outline"
                size="sm"
                onClick={onClear}
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        {/* Fila 2: filtros avanzados */}
        <div
          className="kanban-toolbar-row-filters grid min-w-0 grid-cols-2 gap-2 border-t border-border/40 pt-2 sm:grid-cols-3 lg:grid-cols-5 lg:pt-2.5"
          aria-label="Filtros avanzados"
        >
          {advancedSelects(true)}
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
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-xs font-semibold text-foreground sm:text-sm">Refinar resultados</p>
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </div>
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
              inputFieldClass(Boolean(filter.search?.trim())),
              'pl-8 sm:pl-9'
            )}
            type="search"
            placeholder="Buscar"
            value={filter.search ?? ''}
            onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
          />
        </div>

        <Input
          id="kanban-filter-fecha-desde"
          className={inputFieldClass(Boolean(filter.fecha_min))}
          type="date"
          value={filter.fecha_min ?? ''}
          onChange={(e) => onFilterChange({ fecha_min: e.target.value || undefined })}
          title="Fecha límite desde"
        />
        <Input
          id="kanban-filter-fecha-hasta"
          className={inputFieldClass(Boolean(filter.fecha_max))}
          type="date"
          value={filter.fecha_max ?? ''}
          onChange={(e) => onFilterChange({ fecha_max: e.target.value || undefined })}
          title="Fecha límite hasta"
        />
      </div>

      {showAdvancedRow ? (
        <div
          className="grid min-w-0 grid-cols-2 gap-2 border-t border-border/35 pt-2 sm:grid-cols-3 lg:grid-cols-5"
          aria-label="Filtros avanzados"
        >
          {advancedSelects(true)}
        </div>
      ) : null}
    </div>
  )
}
