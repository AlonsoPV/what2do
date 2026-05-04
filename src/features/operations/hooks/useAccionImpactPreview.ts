import { useMemo } from 'react'
import { useGapAccionesForGapIds, useGaps } from '@/features/kpi/hooks'
import { computeGapStoryProgress } from '@/features/kpi/utils/gapProgress'

type UseAccionImpactPreviewOptions = {
  gapIds: string[]
  storyPoints: number
  enabled?: boolean
}

export type AccionImpactPreviewRow = {
  gapId: string
  gapNombre: string
  puntosCompletados: number
  totalPuntosGap: number
  contribucionPct: number | null
}

export function useAccionImpactPreview({
  gapIds,
  storyPoints,
  enabled = true,
}: UseAccionImpactPreviewOptions) {
  const isEnabled = enabled && gapIds.length > 0
  const { data: gaps = [], isLoading: gapsLoading } = useGaps({
    filters: { activo: true },
  })
  const { data: accionesData, isLoading: accionesLoading } = useGapAccionesForGapIds(
    isEnabled ? gapIds : []
  )

  const acciones = accionesData?.acciones ?? []
  const junctionAccionIdsByGap = accionesData?.junctionAccionIdsByGap ?? new Map<string, Set<string>>()

  const preview = useMemo(() => {
    if (!gapIds.length) return []

    return gapIds.map((gapId) => {
      const gap = gaps.find((g) => g.id === gapId)
      const progress = computeGapStoryProgress(
        gapId,
        acciones,
        gap?.total_story_points ?? 0,
        junctionAccionIdsByGap.get(gapId)
      )
      const contribucion =
        progress.totalPoints > 0 && storyPoints > 0 ? storyPoints / progress.totalPoints : null

      return {
        gapId,
        gapNombre: gap?.nombre ?? gapId,
        puntosCompletados: progress.donePoints,
        totalPuntosGap: progress.totalPoints,
        contribucionPct: contribucion,
      }
    })
  }, [acciones, gapIds, gaps, junctionAccionIdsByGap, storyPoints])

  return {
    preview,
    isLoading: gapsLoading || accionesLoading,
  }
}
