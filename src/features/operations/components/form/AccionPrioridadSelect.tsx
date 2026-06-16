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

type PriorityWithColor = Priority & { color?: string | null }

const inputBase =
  'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

export interface AccionPrioridadSelectProps {
  id: string
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
}

export function AccionPrioridadSelect({ id, value, onChange, disabled }: AccionPrioridadSelectProps) {
  const { data: priorities = [], isLoading } = usePriorities({ activo: true })

  const colorByNombre = useMemo(
    () =>
      new Map(
        (priorities as PriorityWithColor[]).map((priority) => [
          priority.nombre,
          priority.color ?? null,
        ])
      ),
    [priorities]
  )

  const options = useMemo((): PriorityWithColor[] => {
    const sorted = [...priorities].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    const nombre = (value ?? '').trim()
    if (nombre && !sorted.some((p) => p.nombre === nombre)) {
      return [
        {
          id: `legacy-${nombre}`,
          nombre,
          descripcion: null,
          orden: 999,
          activo: false,
          created_at: '',
          updated_at: '',
        },
        ...sorted,
      ]
    }
    return sorted
  }, [priorities, value])

  const selected = (value ?? '').trim()

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
  const sorted = [...priorities].sort((a, b) => a.orden - b.orden)
  return (
    sorted.find((p) => p.nombre === DEFAULT_PRIORITY_NOMBRE)?.nombre ??
    sorted[0]?.nombre ??
    DEFAULT_PRIORITY_NOMBRE
  )
}
