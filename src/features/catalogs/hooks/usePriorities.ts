import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { prioritiesService } from '../services/priorities.service'
import type { CatalogFilter } from '../types/catalogs.types'
import type { CreatePriorityInput, UpdatePriorityInput } from '../types/catalogs.types'

const KEY = ['catalogs', 'priorities'] as const
const CATALOG_STALE_TIME = 10 * 60 * 1000

export const prioritiesQueryKey = (filter: CatalogFilter = {}) => [...KEY, filter] as const

export async function fetchPriorities(filter: CatalogFilter = {}) {
  return prioritiesService.list(filter)
}

export function usePriorities(filter: CatalogFilter = {}) {
  return useQuery({
    queryKey: prioritiesQueryKey(filter),
    queryFn: () => fetchPriorities(filter),
    staleTime: CATALOG_STALE_TIME,
    retry: 1,
  })
}

export function useCreatePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePriorityInput) => prioritiesService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ['acciones'], refetchType: 'active' })
    },
  })
}

export function useUpdatePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePriorityInput }) =>
      prioritiesService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ['acciones'], refetchType: 'active' })
    },
  })
}

export function useTogglePriorityStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      prioritiesService.setActivo(id, activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ['acciones'], refetchType: 'active' })
    },
  })
}
