import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { areasService } from '../services/areas.service'
import type { CatalogFilter } from '../types/catalogs.types'
import type { CreateAreaInput, UpdateAreaInput } from '../types/catalogs.types'

const KEY = ['catalogs', 'areas'] as const
export const areasQueryKey = (filter: CatalogFilter = {}) => [...KEY, filter] as const

export async function fetchAreas(filter: CatalogFilter = {}) {
  return areasService.list(filter)
}

export function useAreas(filter: CatalogFilter = {}) {
  return useQuery({
    queryKey: areasQueryKey(filter),
    queryFn: () => fetchAreas(filter),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

export function useCreateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAreaInput) => areasService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAreaInput }) =>
      areasService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useToggleAreaStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      areasService.setActivo(id, activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
