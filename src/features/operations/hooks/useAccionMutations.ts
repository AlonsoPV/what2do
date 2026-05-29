import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { kpiQueryKeys } from '@/features/kpi/kpiQueryKeys'
import { accionesService } from '@/services/acciones.service'
import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types'

const KEY = ['acciones'] as const

function patchAccionInCache(
  qc: QueryClient,
  id: string,
  patch: Partial<AccionDiaria>
) {
  qc.setQueryData<AccionDiaria | undefined>([...KEY, id], (prev) =>
    prev ? ({ ...prev, ...patch } as AccionDiaria) : prev
  )
  const matches = qc.getQueriesData<AccionDiaria[]>({ queryKey: KEY })
  for (const [queryKey] of matches) {
    qc.setQueryData<AccionDiaria[] | undefined>(queryKey, (prev) => {
      if (!prev || !Array.isArray(prev)) return prev
      let changed = false
      const next = prev.map((item) => {
        if (item.id !== id) return item
        changed = true
        return { ...item, ...patch } as AccionDiaria
      })
      return changed ? next : prev
    })
  }
}

function upsertAccionInCache(qc: QueryClient, accion: AccionDiaria) {
  qc.setQueryData<AccionDiaria>([...KEY, accion.id], accion)
  const matches = qc.getQueriesData<AccionDiaria[]>({ queryKey: KEY })
  for (const [queryKey] of matches) {
    qc.setQueryData<AccionDiaria[] | undefined>(queryKey, (prev) => {
      if (!prev || !Array.isArray(prev)) return prev
      const exists = prev.some((item) => item.id === accion.id)
      if (exists) {
        return prev.map((item) => (item.id === accion.id ? accion : item))
      }
      return [accion, ...prev]
    })
  }
}

function removeAccionFromCache(qc: QueryClient, id: string) {
  qc.removeQueries({ queryKey: [...KEY, id] })
  const matches = qc.getQueriesData<AccionDiaria[]>({ queryKey: KEY })
  for (const [queryKey] of matches) {
    qc.setQueryData<AccionDiaria[] | undefined>(queryKey, (prev) => {
      if (!prev || !Array.isArray(prev)) return prev
      const next = prev.filter((item) => item.id !== id)
      return next.length === prev.length ? prev : next
    })
  }
}

type CacheSnapshot = Array<[readonly unknown[], unknown]>

function snapshotAccionesCache(qc: QueryClient): CacheSnapshot {
  return qc.getQueriesData({ queryKey: KEY }).map(([queryKey, data]) => [queryKey, data] as const)
}

function restoreAccionesCache(qc: QueryClient, snapshot: CacheSnapshot | undefined) {
  if (!snapshot) return
  for (const [queryKey, data] of snapshot) {
    qc.setQueryData(queryKey, data)
  }
}

export function useCreateAccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<AccionDiaria>) => accionesService.create(payload),
    onSuccess: (data) => {
      if (data?.id) {
        upsertAccionInCache(qc, data)
      }
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiAccionImpact, refetchType: 'active' })
    },
  })
}

export function useUpdateAccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AccionDiaria> }) =>
      accionesService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshot = snapshotAccionesCache(qc)
      patchAccionInCache(qc, id, payload)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      restoreAccionesCache(qc, ctx?.snapshot)
    },
    onSuccess: (data) => {
      patchAccionInCache(qc, data.id, data)
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.gaps, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.gapAcciones, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiAccionImpact, refetchType: 'active' })
      if (data.gap_id) {
        qc.invalidateQueries({ queryKey: kpiQueryKeys.gap(data.gap_id) })
        qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpisByGap(data.gap_id) })
      }
    },
  })
}

export function useUpdateAccionEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      estado,
      extra,
    }: {
      id: string
      estado: ActionStatus
      extra?: Partial<AccionDiaria>
    }) => accionesService.updateEstado(id, estado, extra),
    onMutate: async ({ id, estado, extra }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshot = snapshotAccionesCache(qc)
      patchAccionInCache(qc, id, {
        estado,
        ...(extra ?? {}),
      })
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      restoreAccionesCache(qc, ctx?.snapshot)
    },
    onSuccess: (data) => {
      patchAccionInCache(qc, data.id, data)
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.gaps, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.gapAcciones, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiAccionImpact, refetchType: 'active' })
      if (data.gap_id) {
        qc.invalidateQueries({ queryKey: kpiQueryKeys.gap(data.gap_id) })
        qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpisByGap(data.gap_id) })
      }
    },
  })
}

export function useDeleteAccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accionesService.delete(id),
    onSuccess: (_data, id) => {
      removeAccionFromCache(qc, id)
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
      qc.invalidateQueries({ queryKey: kpiQueryKeys.catalogKpiAccionImpact })
    },
  })
}
