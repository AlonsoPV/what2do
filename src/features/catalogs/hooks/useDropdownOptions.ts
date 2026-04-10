import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dropdownCatalogsService } from '../services/dropdownCatalogs.service'
import { dropdownOptionsService } from '../services/dropdownOptions.service'
import type { DropdownOption } from '../types/catalogs.types'
import type { CreateDropdownOptionInput, UpdateDropdownOptionInput } from '../types/catalogs.types'

const KEY = ['catalogs', 'dropdownOptions'] as const

function normalizeCatalogKey(catalogKey: string | undefined | null): string {
  return catalogKey?.trim() ?? ''
}

export function dropdownOptionsByCatalogKeyQueryKey(catalogKey: string | undefined | null) {
  return [...KEY, 'byKey', normalizeCatalogKey(catalogKey)] as const
}

export async function fetchDropdownOptionsByCatalogKey(
  catalogKey: string | undefined | null
): Promise<DropdownOption[]> {
  const normalized = normalizeCatalogKey(catalogKey)
  if (!normalized) return []
  const catalog = await dropdownCatalogsService.getByKey(normalized)
  if (!catalog) return []
  return dropdownOptionsService.listByCatalogId(catalog.id)
}

export function useDropdownOptions(catalogId: string | undefined | null) {
  return useQuery({
    queryKey: [...KEY, catalogId],
    queryFn: () => dropdownOptionsService.listByCatalogId(catalogId!),
    enabled: !!catalogId,
    refetchOnMount: 'always',
  })
}

/** Opciones de un catálogo por su key (ej. 'evidencia_esperada'). Devuelve [] si no existe. */
export function useDropdownOptionsByKey(catalogKey: string | undefined | null) {
  return useQuery({
    queryKey: dropdownOptionsByCatalogKeyQueryKey(catalogKey),
    queryFn: () => fetchDropdownOptionsByCatalogKey(catalogKey),
    enabled: !!normalizeCatalogKey(catalogKey),
    // Si el resultado previo fue vacío, fuerza reintento al montar.
    refetchOnMount: (query) => {
      const current = query.state.data as DropdownOption[] | undefined
      return !current || current.length === 0 ? 'always' : false
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

export function useCreateDropdownOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDropdownOptionInput) => dropdownOptionsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateDropdownOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDropdownOptionInput }) =>
      dropdownOptionsService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useToggleDropdownOptionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      dropdownOptionsService.setActivo(id, activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
