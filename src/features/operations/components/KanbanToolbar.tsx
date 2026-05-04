/**
 * Barra de filtros tipo toolbar — compacta, elegante, estilo SaaS.
 * Búsqueda, fecha, presets (vista dashboard) y selects avanzados.
 */

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
import type { ActionStatus, PrioridadNc } from '@/types'
import { ACTION_STATUS } from '@/types'
import {
  endOfWeekSundayFromYmd,
  lastDayOfMonth,
  matchCreationDatePreset,
  todayWallClockCDMX,
} from '@/lib/dateUtils'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const FECHA_YMD = /^\d{4}-\d{2}-\d{2}$/

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
  { value: 'all', label: 'Estado' },
  ...ACTION_STATUS.map((s) => ({ value: s, label: ESTADO_LABELS[s] ?? s })),
]

const PRIORIDAD_OPTIONS = [
  { value: 'all', label: 'Prioridad' },
  { value: 'P1_Critica', label: 'Crítica' },
  { value: 'P2_Media', label: 'Media' },
  { value: 'P3_Baja', label: 'Baja' },
]

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
  /** Solo `layout="dashboard"`: muestra estado, prioridad, área y responsable. */
  advancedExpanded?: boolean
  className?: string
}

const PRESET_ROWS = [
  { id: 'kanban-preset-hoy', key: 'hoy' as const, label: 'Hoy' },
  { id: 'kanban-preset-semana', key: 'semana' as const, label: 'Semana' },
  { id: 'kanban-preset-mes', key: 'mes' as const, label: 'Mes' },
  { id: 'kanban-preset-todo', key: 'todo' as const, label: 'Todo' },
]

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
  const todayYmd = todayWallClockCDMX()
  const rawFecha = filter.fecha_creacion
  const fechaEffective =
    typeof rawFecha === 'string' && FECHA_YMD.test(rawFecha) ? rawFecha : todayYmd

  const fechaPreset = matchCreationDatePreset(rawFecha, todayYmd)

  const dateDeviatesFromDefault =
    rawFecha === undefined ||
    rawFecha === '' ||
    !FECHA_YMD.test(String(rawFecha)) ||
    rawFecha !== todayYmd

  const hasFilters =
    (filter.search != null && filter.search !== '') ||
    dateDeviatesFromDefault ||
    filter.estado != null ||
    filter.prioridad != null ||
    (filter.area != null && filter.area !== '') ||
    filter.responsable != null

  const estadoValue = Array.isArray(filter.estado)
    ? (filter.estado[0] ?? 'all')
    : (filter.estado ?? 'all')
  const prioridadValue = Array.isArray(filter.prioridad)
    ? (filter.prioridad[0] ?? 'all')
    : (filter.prioridad ?? 'all')

  const showAdvancedRow = layout !== 'dashboard' || advancedExpanded !== false

  const applyPreset = (preset: 'hoy' | 'semana' | 'mes' | 'todo') => {
    if (preset === 'todo') {
      onFilterChange({ fecha_creacion: undefined })
      return
    }
    if (preset === 'hoy') {
      onFilterChange({ fecha_creacion: todayYmd })
      return
    }
    if (preset === 'semana') {
      onFilterChange({ fecha_creacion: endOfWeekSundayFromYmd(todayYmd) })
      return
    }
    const [y, m] = todayYmd.split('-').map(Number)
    onFilterChange({ fecha_creacion: lastDayOfMonth(y, m) })
  }

  const advancedSelects = (
    <>
      <Select
        value={estadoValue}
        onValueChange={(v) =>
          onFilterChange({ estado: v === 'all' ? undefined : (v as ActionStatus) })
        }
      >
        <SelectTrigger
          id="kanban-filter-estado"
          className="kanban-toolbar-estado h-9 min-w-0 flex-1 rounded-lg border-border/60 bg-background/80 text-sm sm:w-[130px] sm:flex-none"
        >
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {ESTADO_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={prioridadValue}
        onValueChange={(v) =>
          onFilterChange({ prioridad: v === 'all' ? undefined : (v as PrioridadNc) })
        }
      >
        <SelectTrigger
          id="kanban-filter-prioridad"
          className="kanban-toolbar-prioridad h-9 min-w-0 flex-1 rounded-lg border-border/60 bg-background/80 text-sm sm:w-[110px] sm:flex-none"
        >
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          {PRIORIDAD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.area ?? 'all'}
        onValueChange={(v) =>
          onFilterChange({ area: v === 'all' ? undefined : v })}
      >
        <SelectTrigger
          id="kanban-filter-area"
          className="kanban-toolbar-area h-9 min-w-0 flex-1 rounded-lg border-border/60 bg-background/80 text-sm sm:w-[120px] sm:flex-none"
        >
          <SelectValue placeholder="Su área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Su área</SelectItem>
          {areas.map((a) => (
            <SelectItem key={a.id} value={a.nombre}>
              {a.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.responsable ?? 'all'}
        onValueChange={(v) =>
          onFilterChange({ responsable: v === 'all' ? undefined : v })
        }
      >
        <SelectTrigger
          id="kanban-filter-responsable"
          className="kanban-toolbar-responsable h-9 min-w-0 flex-1 rounded-lg border-border/60 bg-background/80 text-sm sm:w-[140px] sm:flex-none"
        >
          <SelectValue placeholder="Su responsable" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Su responsable</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  if (!visible) return null

  if (layout !== 'dashboard') {
    return (
      <div
        className={cn(
          'kanban-toolbar flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 backdrop-blur-sm',
          'transition-opacity duration-200',
          className
        )}
      >
        <div className="kanban-toolbar-search-wrap relative min-w-0 max-w-none flex-1 basis-full sm:min-w-[140px] sm:max-w-[240px] sm:basis-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="kanban-filter-search"
            className="kanban-toolbar-search h-8 rounded-lg border-border/60 bg-background/80 pl-9 text-sm focus-visible:ring-2"
            type="search"
            placeholder="Buscar acciones..."
            value={filter.search ?? ''}
            onChange={(e) =>
              onFilterChange({ search: e.target.value || undefined })
            }
          />
        </div>
        <Input
          id="kanban-filter-fecha"
          className="kanban-toolbar-fecha h-8 min-w-[8.5rem] flex-1 rounded-lg border-border/60 bg-background/80 text-sm sm:flex-none sm:w-[130px]"
          type="date"
          value={fechaEffective}
          onChange={(e) =>
            onFilterChange({
              fecha_creacion: e.target.value ? e.target.value : todayYmd,
            })
          }
          title="Ver acciones creadas hasta este día (por defecto: hoy, zona Ciudad de México)"
        />
        {advancedSelects}
        {hasFilters && (
          <Button
            id="kanban-toolbar-clear"
            className="kanban-toolbar-clear h-8 gap-1.5 text-muted-foreground hover:text-foreground"
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

        {fechaPreset === 'todo' ? (
          <div
            id="kanban-filter-fecha-all"
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 text-xs text-muted-foreground"
            title="Sin tope por fecha de creación: se listan todas las acciones accesibles"
          >
            Sin tope de fecha
          </div>
        ) : (
          <Input
            id="kanban-filter-fecha"
            className="kanban-toolbar-fecha h-9 min-w-[9rem] shrink-0 rounded-lg border-border/60 bg-background text-sm shadow-sm sm:w-[140px]"
            type="date"
            value={fechaEffective}
            onChange={(e) => {
              const v = e.target.value
              if (!v) applyPreset('todo')
              else onFilterChange({ fecha_creacion: v })
            }}
            title="Corte por creación: acciones creadas hasta este día (zona Ciudad de México)"
          />
        )}

        <div
          role="group"
          aria-label="Alcance por fecha de creación"
          className="flex shrink-0 flex-wrap items-center gap-1 rounded-xl border border-border/50 bg-muted/25 p-1"
        >
          {PRESET_ROWS.map(({ id, key: presetKey, label }) => (
            <Button
              key={presetKey}
              id={id}
              type="button"
              size="sm"
              variant={fechaPreset === presetKey ? 'secondary' : 'ghost'}
              className={cn(
                'h-8 rounded-md px-2.5 text-xs font-medium sm:px-3 sm:text-sm',
                fechaPreset === presetKey && 'shadow-sm'
              )}
              onClick={() => applyPreset(presetKey)}
            >
              {label}
            </Button>
          ))}
        </div>

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
