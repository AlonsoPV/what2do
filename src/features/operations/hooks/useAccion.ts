import { useQuery } from '@tanstack/react-query'
import { accionesService } from '@/services/acciones.service'

const KEY = ['acciones'] as const

type UseAccionOptions = {
  enabled?: boolean
  refetchOnMount?: boolean | 'always'
}

export function useAccion(id: string | undefined | null, options?: UseAccionOptions) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => accionesService.getById(id!),
    enabled: options?.enabled ?? !!id,
    staleTime: 0,
    refetchOnMount: options?.refetchOnMount ?? 'always',
  })
}
