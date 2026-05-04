/**
 * Filtros para la tabla de acciones (spec §4.3).
 * Fecha, estado, prioridad, área, responsable, búsqueda.
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { Search, X } from 'lucide-react'
import { todayWallClockCDMX } from '@/lib/dateUtils'

const ESTADO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  ...ACTION_STATUS.map((s) => ({ value: s, label: s })),
]

const PRIORIDAD_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'P1_Critica', label: 'Crítica' },
  { value: 'P2_Media', label: 'Media' },
  { value: 'P3_Baja', label: 'Baja' },
]

export interface AccionesFilterBarProps {
  filter: AccionesFilter
  onFilterChange: (f: AccionesFilter) => void
  onClear: () => void
}

export function AccionesFilterBar({
  filter,
  onFilterChange,
  onClear,
}: AccionesFilterBarProps) {
  const { data: users = [] } = useUsers({ activo: true })
  const { data: areas = [] } = useAreas({ activo: true })
  const todayYmd = todayWallClockCDMX()
  const fechaEffective = filter.fecha_creacion ?? todayYmd
  const fechaDiffersFromToday =
    filter.fecha_creacion != null && filter.fecha_creacion !== todayYmd

  const hasFilters =
    (filter.search != null && filter.search !== '') ||
    fechaDiffersFromToday ||
    filter.estado != null ||
    filter.prioridad != null ||
    (filter.area != null && filter.area !== '') ||
    filter.responsable != null

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <div className="w-[160px] space-y-2">
        <Label htmlFor="acciones-fecha">Visible hasta (fecha)</Label>
        <Input
          id="acciones-fecha"
          type="date"
          value={fechaEffective}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              fecha_creacion: e.target.value ? e.target.value : todayYmd,
            })
          }
          title="Visible hasta (por defecto: hoy, zona Ciudad de México)"
        />
      </div>
      <div className="min-w-[180px] flex-1 space-y-2">
        <Label htmlFor="acciones-search">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="acciones-search"
            placeholder="Descripción o evidencia..."
            value={filter.search ?? ''}
            onChange={(e) =>
              onFilterChange({ ...filter, search: e.target.value || undefined })
            }
            className="pl-9"
          />
        </div>
      </div>
      <div className="w-[140px] space-y-2">
        <Label>Estado</Label>
        <Select
          value={
            Array.isArray(filter.estado)
              ? (filter.estado[0] ?? 'all')
              : (filter.estado ?? 'all')
          }
          onValueChange={(v) =>
            onFilterChange({
              ...filter,
              estado: v === 'all' ? undefined : (v as ActionStatus),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            {ESTADO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[130px] space-y-2">
        <Label>Prioridad</Label>
        <Select
          value={
            Array.isArray(filter.prioridad)
              ? (filter.prioridad[0] ?? 'all')
              : (filter.prioridad ?? 'all')
          }
          onValueChange={(v) =>
            onFilterChange({
              ...filter,
              prioridad: v === 'all' ? undefined : (v as PrioridadNc),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            {PRIORIDAD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[160px] space-y-2">
        <Label>Área</Label>
        <Select
          value={filter.area ?? 'all'}
          onValueChange={(v) =>
            onFilterChange({
              ...filter,
              area: v === 'all' ? undefined : v,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.nombre}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[180px] space-y-2">
        <Label>Responsable</Label>
        <Select
          value={filter.responsable ?? 'all'}
          onValueChange={(v) =>
            onFilterChange({
              ...filter,
              responsable: v === 'all' ? undefined : v,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
