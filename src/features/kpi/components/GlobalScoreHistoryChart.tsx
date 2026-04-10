import { useMemo, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGlobalScoreSnapshots } from '../hooks/useGlobalScoreSnapshots'
import type { GlobalScoreSnapshot } from '../types/kpi.types'

const CHART_H = 160
const PAD_L = 44
const PAD_R = 12
const PAD_T = 8
const PAD_B = 28

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function formatTickLabel(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function GlobalScoreHistoryChart({
  limit = 90,
  title = 'Evolución del score global',
  description = 'Serie temporal desde snapshots guardados (0–100%).',
}: {
  limit?: number
  title?: string
  description?: string
}) {
  const { data: raw = [], isLoading, isError } = useGlobalScoreSnapshots({ limit })

  const series = useMemo(() => {
    const copy = [...raw] as GlobalScoreSnapshot[]
    copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return copy
  }, [raw])

  const svg = useMemo(() => {
    const n = series.length
    const innerW = 400
    const innerH = CHART_H - PAD_T - PAD_B
    const w = PAD_L + innerW + PAD_R
    const h = CHART_H

    if (n === 0) {
      return { w, h, body: null as ReactNode }
    }

    const scores = series.map((s) => {
      const v = Number(s.score)
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
    })
    const minS = 0
    const maxS = 1
    const xAt = (i: number) => {
      if (n === 1) return PAD_L + innerW / 2
      return PAD_L + (innerW * i) / (n - 1)
    }
    const yAt = (s: number) => {
      const t = (s - minS) / (maxS - minS || 1)
      return PAD_T + innerH * (1 - t)
    }

    const pts = scores.map((s, i) => ({ x: xAt(i), y: yAt(s) }))
    const d = buildPath(pts)

    const firstLabel = formatTickLabel(series[0]!.created_at)
    const lastLabel = formatTickLabel(series[n - 1]!.created_at)

    const yTicks = [0, 0.25, 0.5, 0.75, 1]

    return {
      w,
      h,
      body: (
        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="overflow-visible text-muted-foreground"
          role="img"
          aria-label={`Gráfica de evolución del score global con ${n} puntos.`}
        >
          {yTicks.map((yt) => {
            const yy = yAt(yt)
            return (
              <g key={yt}>
                <line
                  x1={PAD_L}
                  y1={yy}
                  x2={PAD_L + innerW}
                  y2={yy}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <text x={PAD_L - 6} y={yy + 4} textAnchor="end" className="fill-current text-[9px]">
                  {Math.round(yt * 100)}%
                </text>
              </g>
            )
          })}
          <path
            d={d}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle key={series[i]!.id} cx={p.x} cy={p.y} r={3} className="fill-primary" />
          ))}
          <text x={PAD_L} y={h - 8} className="fill-current text-[9px]">
            {firstLabel}
          </text>
          <text x={PAD_L + innerW} y={h - 8} textAnchor="end" className="fill-current text-[9px]">
            {lastLabel}
          </text>
        </svg>
      ),
    }
  }, [series])

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando historial…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">No se pudo cargar el historial de snapshots.</p>
        ) : series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay snapshots del score global. Se pueden registrar al cerrar día o por proceso batch.
          </p>
        ) : (
          <div className="w-full min-w-0">{svg.body}</div>
        )}
      </CardContent>
    </Card>
  )
}
