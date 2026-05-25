import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sprintsService, retroService } from '@/services/sprints.service'
import type { Sprint, SprintRetroItem } from '@/types'

export const SPRINT_KEYS = {
  all: ['sprints'] as const,
  activo: ['sprints', 'activo'] as const,
  retro: (sprintId: string) => ['sprints', sprintId, 'retro'] as const,
}

export function useSprintActivo() {
  return useQuery({
    queryKey: SPRINT_KEYS.activo,
    queryFn: () => sprintsService.getActivo(),
    staleTime: 60_000,
  })
}

export function useSprints() {
  return useQuery({
    queryKey: SPRINT_KEYS.all,
    queryFn: () => sprintsService.list(),
    staleTime: 60_000,
  })
}

export function useCrearSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Sprint>) => sprintsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SPRINT_KEYS.all })
    },
  })
}

export function useActualizarSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Sprint> }) =>
      sprintsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SPRINT_KEYS.all })
    },
  })
}

export function useCerrarSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, velocidadReal }: { id: string; velocidadReal: number }) =>
      sprintsService.cerrar(id, velocidadReal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SPRINT_KEYS.all })
      qc.invalidateQueries({ queryKey: ['acciones'] })
    },
  })
}

export function useSprintRetro(sprintId: string | null) {
  return useQuery({
    queryKey: SPRINT_KEYS.retro(sprintId ?? ''),
    queryFn: () => retroService.listBySprint(sprintId!),
    enabled: !!sprintId,
  })
}

export function useAgregarRetroItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: Omit<SprintRetroItem, 'id' | 'created_at'>) => retroService.add(item),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: SPRINT_KEYS.retro(vars.sprint_id) })
    },
  })
}

export function useEliminarRetroItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sprintId }: { id: string; sprintId: string }) =>
      retroService.delete(id).then(() => sprintId),
    onSuccess: (sprintId) => {
      qc.invalidateQueries({ queryKey: SPRINT_KEYS.retro(sprintId) })
    },
  })
}
