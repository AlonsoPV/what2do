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
import type { UsersFilter } from '../types/user.types'
import { useRoles } from '@/features/catalogs/hooks/useRoles'
import { Search, X } from 'lucide-react'

interface UserFiltersProps {
  filter: UsersFilter
  onFilterChange: (f: UsersFilter) => void
  onClear: () => void
}

const ACTIVO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
] as const

export function UserFilters({ filter, onFilterChange, onClear }: UserFiltersProps) {
  const { data: roles = [] } = useRoles({ activo: true })

  const hasActiveFilters =
    !!filter.search?.trim() ||
    filter.rol != null ||
    filter.activo !== undefined

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <div className="flex-1 min-w-[200px] space-y-2">
        <Label htmlFor="search">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Nombre, correo o área…"
            value={filter.search ?? ''}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value || undefined })}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">Filtra por nombre, correo o área.</p>
      </div>
      <div className="w-[180px] space-y-2">
        <Label>Rol</Label>
        <Select
          value={filter.rol ?? 'all'}
          onValueChange={(v) =>
            onFilterChange({ ...filter, rol: v === 'all' ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.nombre}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[140px] space-y-2">
        <Label>Estatus</Label>
        <Select
          value={
            filter.activo === undefined
              ? 'all'
              : filter.activo
                ? 'true'
                : 'false'
          }
          onValueChange={(v) =>
            onFilterChange({
              ...filter,
              activo: v === 'all' ? undefined : v === 'true',
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
