import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accionCheckpointsService } from '@/services/accionCheckpoints.service'
import type { AccionCheckpoint } from '@/types'
import { ACCION_CHECKPOINTS_KEY, accionCheckpointsByAccionIdQueryKey } from './useAccionCheckpoints'

function invalidateCheckpointQueries(
  qc: ReturnType<typeof useQueryClient>,
  accionId?: string
) {
  if (accionId) {
    qc.invalidateQueries({
      queryKey: accionCheckpointsByAccionIdQueryKey(accionId),
      refetchType: 'active',
    })
  }
  qc.invalidateQueries({
    queryKey: [...ACCION_CHECKPOINTS_KEY, 'progress'],
    refetchType: 'active',
  })
}

export function useInsertAccionCheckpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof accionCheckpointsService.insert>[0]) =>
      accionCheckpointsService.insert(input),
    onSuccess: (row) => {
      invalidateCheckpointQueries(qc, row.accion_id)
    },
  })
}

export function useDeleteAccionCheckpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; accionId: string }) => accionCheckpointsService.delete(id),
    onSuccess: (_void, vars) => {
      invalidateCheckpointQueries(qc, vars.accionId)
    },
  })
}

export function useUpdateAccionCheckpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<AccionCheckpoint, 'texto' | 'orden' | 'obligatorio'>>
    }) => accionCheckpointsService.update(id, patch),
    onSuccess: (row) => {
      invalidateCheckpointQueries(qc, row.accion_id)
    },
  })
}

export function useToggleAccionCheckpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      completado,
      checkedByUsuarioId,
    }: {
      id: string
      completado: boolean
      checkedByUsuarioId: string | null
    }) => accionCheckpointsService.setCompletado(id, completado, checkedByUsuarioId),
    onSuccess: (row) => {
      invalidateCheckpointQueries(qc, row.accion_id)
    },
  })
}
