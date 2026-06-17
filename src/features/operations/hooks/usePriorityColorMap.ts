import { useMemo } from 'react'
import { usePriorities } from '@/features/catalogs/hooks/usePriorities'
import type { Priority } from '@/features/catalogs/types/catalogs.types'

export function usePriorityColorMap(): Map<string, string | null> {
  const { data: priorities = [] } = usePriorities()

  return useMemo(
    () => new Map(priorities.map((priority: Priority) => [priority.nombre, priority.color ?? null])),
    [priorities]
  )
}
