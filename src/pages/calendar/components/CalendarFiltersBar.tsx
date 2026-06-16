import { memo, useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { ACCION_ESTADO_LABELS } from '@/features/operations/utils/accionEstadoDisplay'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { CalendarFilters } from '@/features/calendar'
import type { ActionStatus } from '@/types'
import { cn } from '@/lib/utils'

const ALL_FILTER_VALUE = 'all'

const ITEM_TYPE_OPTIONS: { value: NonNullable<CalendarFilters['itemType']>; label: string }[] = [
  { value: 'todos', label: 'Todo el calendario' },
  { value: 'acciones', label: 'Solo acciones' },
  { value: 'recordatorios', label: 'Solo recordatorios' },
  { value: 'minutas', label: 'Solo minutas' },
]

/** Calendario: acciones activas (sin Verificado). */
const CALENDAR_ESTADO_OPTIONS: { value: ActionStatus; label: string }[] = (
  Object.entries(ACCION_ESTADO_LABELS) as [ActionStatus, string][]
)
  .filter(([estado]) => estado !== 'Verificado')
  .map(([value, label]) => ({ value, label }))

const CALENDAR_FILTER_SELECT_CONTENT_CLASS =
  'z-[200] max-h-[min(18rem,72dvh)] min-w-[var(--radix-select-trigger-width)] [&>*:nth-child(2)]:!h-auto [&>*:nth-child(2)]:max-h-[min(17rem,68dvh)]'

const CALENDAR_FILTER_TRIGGER_CLASS =
  'h-auto min-h-10 w-full min-w-0 rounded-lg border-border/60 bg-background py-2 text-xs sm:min-h-9 sm:text-sm [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left'

const CALENDAR_FILTER_TRIGGER_ACTIVE = 'border-primary/45 bg-primary/5 ring-1 ring-primary/15'

export function hasCalendarActiveFilters(filters: CalendarFilters): boolean {
  return Boolean(
    filters.area ||
      filters.responsable ||
      filters.estado ||
      (filters.itemType && filters.itemType !== 'todos')
  )
}

function calendarFiltersApplyToAcciones(itemType: CalendarFilters['itemType']): boolean {
  return !itemType || itemType === 'todos' || itemType === 'acciones'
}

function filterTriggerLabel(
  value: string,
  filterLabel: string,
  selectedLabel?: string,
  allValue = ALL_FILTER_VALUE
): string {
  if (value === allValue) return filterLabel
  return selectedLabel ?? filterLabel
}

function CalendarFilterField({
  label,
  htmlFor,
  children,
  className,
  disabled,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        'calendar-filter-field flex min-w-0 flex-col gap-1',
        disabled && 'opacity-50',
        className
      )}
    >
      <Label htmlFor={htmlFor} className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

export interface CalendarFiltersBarProps {
  filters: CalendarFilters
  onFiltersChange: (next: CalendarFilters) => void
}

export const CalendarFiltersBar = memo(function CalendarFiltersBar({
  filters,
  onFiltersChange,
}: CalendarFiltersBarProps) {
  const { data: users = [] } = useUsers({ activo: true })
  const { data: areas = [] } = useAreas({ activo: true })

  const hasActiveFilters = hasCalendarActiveFilters(filters)
  const actionFiltersEnabled = calendarFiltersApplyToAcciones(filters.itemType)

  const itemTypeValue = filters.itemType ?? 'todos'
  const areaValue = filters.area ?? ALL_FILTER_VALUE
  const responsableValue = filters.responsable ?? ALL_FILTER_VALUE
  const estadoValue = filters.estado ?? ALL_FILTER_VALUE

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [users]
  )

  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [areas]
  )

  const handleItemTypeChange = (value: string) => {
    const itemType = value as CalendarFilters['itemType']
    if (itemType === 'recordatorios' || itemType === 'minutas') {
      onFiltersChange({
        itemType,
        area: undefined,
        responsable: undefined,
        estado: undefined,
      })
      return
    }
    onFiltersChange({ ...filters, itemType })
  }

  const selectTriggerClass = (active: boolean) =>
    cn(CALENDAR_FILTER_TRIGGER_CLASS, active && CALENDAR_FILTER_TRIGGER_ACTIVE)

  return (
    <div
      id="calendar-filters"
      className="calendar-filters rounded-xl border border-border/60 bg-card/80 p-2.5 shadow-sm sm:p-3"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 sm:pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground sm:text-sm">Filtros</p>
          {!actionFiltersEnabled ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
              Área, responsable y estado aplican solo a acciones.
            </p>
          ) : null}
        </div>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={() => onFiltersChange({})}
          >
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Limpiar
          </Button>
        ) : null}
      </div>

      <div
        className="mt-2.5 grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
        aria-label="Filtros del calendario"
      >
        <CalendarFilterField label="Mostrar" htmlFor="calendar-filter-tipo">
          <Select value={itemTypeValue} onValueChange={handleItemTypeChange}>
            <SelectTrigger
              id="calendar-filter-tipo"
              className={selectTriggerClass(itemTypeValue !== 'todos')}
            >
              <SelectValue placeholder="Mostrar">
                {filterTriggerLabel(
                  itemTypeValue,
                  'Mostrar',
                  ITEM_TYPE_OPTIONS.find((o) => o.value === itemTypeValue)?.label,
                  'todos'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={CALENDAR_FILTER_SELECT_CONTENT_CLASS} position="popper">
              {ITEM_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="whitespace-normal">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CalendarFilterField>

        <CalendarFilterField
          label="Área"
          htmlFor="calendar-filter-area"
          disabled={!actionFiltersEnabled}
        >
          <Select
            value={areaValue}
            disabled={!actionFiltersEnabled}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                area: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          >
            <SelectTrigger
              id="calendar-filter-area"
              className={selectTriggerClass(areaValue !== ALL_FILTER_VALUE)}
            >
              <SelectValue placeholder="Área">
                {filterTriggerLabel(
                  areaValue,
                  'Área',
                  areaValue !== ALL_FILTER_VALUE ? areaValue : undefined
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={CALENDAR_FILTER_SELECT_CONTENT_CLASS} position="popper">
              <SelectItem value={ALL_FILTER_VALUE} className="whitespace-normal">
                Todas las áreas
              </SelectItem>
              {sortedAreas.map((area) => (
                <SelectItem key={area.id} value={area.nombre} className="whitespace-normal">
                  {area.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CalendarFilterField>

        <CalendarFilterField
          label="Responsable"
          htmlFor="calendar-filter-responsable"
          disabled={!actionFiltersEnabled}
        >
          <Select
            value={responsableValue}
            disabled={!actionFiltersEnabled}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                responsable: value === ALL_FILTER_VALUE ? undefined : value,
              })
            }
          >
            <SelectTrigger
              id="calendar-filter-responsable"
              className={selectTriggerClass(responsableValue !== ALL_FILTER_VALUE)}
            >
              <SelectValue placeholder="Responsable">
                {filterTriggerLabel(
                  responsableValue,
                  'Responsable',
                  sortedUsers.find((user) => user.id === responsableValue)?.nombre
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={CALENDAR_FILTER_SELECT_CONTENT_CLASS} position="popper">
              <SelectItem value={ALL_FILTER_VALUE} className="whitespace-normal">
                Todos los responsables
              </SelectItem>
              {sortedUsers.map((user) => (
                <SelectItem key={user.id} value={user.id} className="whitespace-normal">
                  {user.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CalendarFilterField>

        <CalendarFilterField
          label="Estado"
          htmlFor="calendar-filter-estado"
          disabled={!actionFiltersEnabled}
        >
          <Select
            value={estadoValue}
            disabled={!actionFiltersEnabled}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                estado: value === ALL_FILTER_VALUE ? undefined : (value as ActionStatus),
              })
            }
          >
            <SelectTrigger
              id="calendar-filter-estado"
              className={selectTriggerClass(estadoValue !== ALL_FILTER_VALUE)}
            >
              <SelectValue placeholder="Estado">
                {filterTriggerLabel(
                  estadoValue,
                  'Estado',
                  CALENDAR_ESTADO_OPTIONS.find((option) => option.value === estadoValue)?.label
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={CALENDAR_FILTER_SELECT_CONTENT_CLASS} position="popper">
              <SelectItem value={ALL_FILTER_VALUE} className="whitespace-normal">
                Todos los estados
              </SelectItem>
              {CALENDAR_ESTADO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="whitespace-normal">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CalendarFilterField>
      </div>
    </div>
  )
})
