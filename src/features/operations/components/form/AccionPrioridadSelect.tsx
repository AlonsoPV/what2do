import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePriorities } from '@/features/catalogs/hooks/usePriorities'
import type { Priority } from '@/features/catalogs/types/catalogs.types'
import { cn } from '@/lib/utils'
import { AccionPriorityBadge } from '../AccionPriorityBadge'
import { DEFAULT_PRIORITY_NOMBRE } from '../../utils/priorityLabels'

const inputBase =
  'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

export interface AccionPrioridadSelectProps {
  id: string
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  /** Si la acción tiene FK al catálogo, resuelve nombre/color aunque el texto esté desfasado. */
  prioridadId?: string | null
}

export function AccionPrioridadSelect({
  id,
  value,
  onChange,
  disabled,
  prioridadId,
}: AccionPrioridadSelectProps) {
  const { data: priorities = [], isLoading } = usePriorities()

  const colorByNombre = useMemo(
    () => new Map(priorities.map((priority: Priority) => [priority.nombre, priority.color ?? null])),
    [priorities]
  )

  const resolvedFromCatalog = useMemo(() => {
    if (prioridadId) {
      const byId = priorities.find((p) => p.id === prioridadId)
      if (byId) return byId
    }
    const nombre = (value ?? '').trim()
    if (!nombre) return undefined
    return priorities.find((p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase())
  }, [prioridadId, priorities, value])

  const displayNombre = resolvedFromCatalog?.nombre ?? (value ?? '').trim()

  const options = useMemo((): Priority[] => {
    const active = priorities
      .filter((p) => p.activo)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    const nombre = displayNombre
    if (!nombre) return active

    const current = resolvedFromCatalog ?? priorities.find((p) => p.nombre === nombre)
    if (current && !active.some((p) => p.id === current.id)) {
      return [...active, current].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    }
    if (!current) {
      return [
        ...active,
        {
          id: `legacy-${nombre}`,
          nombre,
          descripcion: null,
          color: null,
          orden: 999,
          activo: false,
          created_at: '',
          updated_at: '',
        },
      ]
    }
    return active
  }, [priorities, displayNombre, resolvedFromCatalog])

  const selected = displayNombre

  return (
    <>
      {isLoading && <p className="text-xs text-muted-foreground">Cargando prioridades…</p>}
      <Select
        value={selected || '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
        disabled={disabled || (isLoading && options.length === 0)}
      >
        <SelectTrigger id={id} className={cn(inputBase, 'h-10 justify-start')}>
          {selected ? (
            <AccionPriorityBadge
              prioridad={selected}
              catalogColor={colorByNombre.get(selected)}
              compact
              showDot
            />
          ) : (
            <SelectValue placeholder="Seleccionar prioridad" />
          )}
        </SelectTrigger>
        <SelectContent>
          {options.map((priority) => (
            <SelectItem key={priority.id} value={priority.nombre}>
              <AccionPriorityBadge
                prioridad={priority.nombre}
                catalogColor={colorByNombre.get(priority.nombre)}
                compact
                showDot
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

export function resolveDefaultPrioridadNombre(priorities: Priority[]): string {
  const active = priorities.filter((p) => p.activo)
  const sorted = [...active].sort((a, b) => a.orden - b.orden)
  return (
    sorted.find((p) => p.nombre === DEFAULT_PRIORITY_NOMBRE)?.nombre ??
    sorted[0]?.nombre ??
    DEFAULT_PRIORITY_NOMBRE
  )
}
