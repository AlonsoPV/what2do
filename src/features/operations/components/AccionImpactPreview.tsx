import { useAccionImpactPreview } from '../hooks'

type AccionImpactPreviewProps = {
  gapIds: string[]
  storyPoints: number
}

export function AccionImpactPreview({
  gapIds,
  storyPoints,
}: AccionImpactPreviewProps) {
  const { preview, isLoading } = useAccionImpactPreview({ gapIds, storyPoints })

  if (!gapIds.length) return null

  if (isLoading) {
    return (
      <div
        className="space-y-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-3"
        role="status"
        aria-busy="true"
        aria-label="Calculando vista previa del gap"
      >
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full max-w-md animate-pulse rounded bg-muted/80" />
        <div className="h-3 w-3/4 max-w-sm animate-pulse rounded bg-muted/60" />
      </div>
    )
  }

  return (
    <div
      className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Avance de la brecha seleccionada
      </p>
      {preview.map((p) => (
        <div key={p.gapId} className="space-y-1.5 border-b border-border/40 pb-2 last:border-0 last:pb-0">
          <p className="text-sm font-semibold text-foreground">{p.gapNombre}</p>
          {p.totalPuntosGap > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Progreso del gap hoy:{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {p.puntosCompletados} / {p.totalPuntosGap} pts
                </span>{' '}
                (historias en Hecho / Verificado)
              </p>
              {storyPoints > 0 && p.contribucionPct != null ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Con los{' '}
                  <span className="font-medium text-foreground">
                    {storyPoints} pts
                  </span>{' '}
                  de esta acción, representas aproximadamente un{' '}
                  <span className="font-medium text-foreground">
                    {(p.contribucionPct * 100).toFixed(1)}%
                  </span>{' '}
                  del esfuerzo total declarado para este gap (según los puntos ya imputados al cierre).
                </p>
              ) : storyPoints === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Cuando la acción tenga puntos asignados, verás aquí qué parte representan respecto al total
                  declarado del gap.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esta brecha no tiene puntos totales configurados en catálogo; el seguimiento por puntos no aplica
              hasta que se defina en la ficha del gap.
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
