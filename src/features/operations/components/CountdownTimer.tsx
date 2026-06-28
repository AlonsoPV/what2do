/**
 * Temporizador de cuenta regresiva hasta hora límite (spec §5.3).
 * Actualización cada minuto; muestra "Xh Ym", "Vencido" o estado completado.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ActionStatus } from '@/types'

function getDeadlineMs(fecha: string, horaLimite: string): number | null {
  const [y, m, d] = fecha.split('-').map(Number)
  const [h, min] = (horaLimite ?? '23:59').split(':').map(Number)
  const deadline = new Date(y, m - 1, d, h, min, 0)
  return isNaN(deadline.getTime()) ? null : deadline.getTime()
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Vencido'
  const totalH = Math.floor(ms / 3_600_000)
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || parts.length === 0) parts.push(`${h}h`)
  return parts.join(' ')
}

export interface CountdownTimerProps {
  /** Fecha YYYY-MM-DD */
  fecha: string
  /** Hora límite HH:MM */
  hora_limite: string
  /** Si está Hecho/Verificado se muestra estado completado en lugar de cuenta regresiva */
  estado?: ActionStatus
  /** Variante compacta para tarjetas Kanban */
  variant?: 'default' | 'compact'
  className?: string
}

export function CountdownTimer({
  fecha,
  hora_limite,
  estado,
  variant = 'default',
  className,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(() => {
    const ms = getDeadlineMs(fecha, hora_limite)
    return ms != null ? ms - Date.now() : null
  })

  const isComplete = estado === 'Completada'
  const deadlineMs = getDeadlineMs(fecha, hora_limite)

  useEffect(() => {
    if (isComplete || deadlineMs == null) return
    const tick = () => setRemaining(deadlineMs - Date.now())
    const id = setInterval(tick, 60_000)
    tick()
    return () => clearInterval(id)
  }, [deadlineMs, isComplete])

  if (isComplete) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-emerald-600',
          variant === 'compact' && 'text-xs',
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Completado</span>
      </span>
    )
  }

  if (deadlineMs == null) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)}>
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>—</span>
      </span>
    )
  }

  const ms = remaining ?? deadlineMs - Date.now()
  const isOverdue = ms <= 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium tabular-nums text-foreground',
        variant === 'compact' && 'text-xs',
        isOverdue && 'text-destructive',
        className
      )}
    >
      {isOverdue ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span>{formatRemaining(ms)}</span>
    </span>
  )
}
