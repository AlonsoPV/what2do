import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accionCheckpointsService } from '@/services/accionCheckpoints.service'

export const ACCION_CHECKPOINTS_KEY = ['accion_checkpoints'] as const
export const checklistProgressQueryKey = (accionIds: string[]) =>
  [...ACCION_CHECKPOINTS_KEY, 'progress', [...accionIds].sort().join(',')] as const
export const accionCheckpointsByAccionIdQueryKey = (accionId: string | undefined) =>
  [...ACCION_CHECKPOINTS_KEY, accionId] as const

export function useAccionCheckpoints(accionId: string | undefined) {
  return useQuery({
    queryKey: accionCheckpointsByAccionIdQueryKey(accionId),
    queryFn: () => accionCheckpointsService.listByAccionId(accionId!),
    enabled: Boolean(accionId),
  })
}

/** Progreso por acción (checkpoints activos): total y completados. */
export function useChecklistProgressByAccionIds(accionIds: string[]) {
  return useQuery({
    queryKey: checklistProgressQueryKey(accionIds),
    queryFn: () => accionCheckpointsService.progressByAccionIds(accionIds),
    enabled: accionIds.length > 0,
  })
}

/**
 * Mapa accion_id → hay pendientes que bloquean Hecho (derivado de `useChecklistProgressByAccionIds`).
 * Misma query en caché que el hook de progreso.
 */
export function useCheckpointsPendingByAccionIds(accionIds: string[]) {
  const progressQuery = useChecklistProgressByAccionIds(accionIds)
  const pendingMap = useMemo(() => {
    const r: Record<string, boolean> = {}
    for (const id of accionIds) {
      const p = progressQuery.data?.[id] ?? { total: 0, completed: 0 }
      r[id] = p.total > 0 && p.completed < p.total
    }
    return r
  }, [progressQuery.data, accionIds])
  return { ...progressQuery, data: pendingMap }
}
