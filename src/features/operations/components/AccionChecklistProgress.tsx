import { ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AccionChecklistProgressProps {
  completados: number
  total: number
  className?: string
}

export function AccionChecklistProgress({ completados, total, className }: AccionChecklistProgressProps) {
  if (total === 0) return null
  const pct = Math.min(100, Math.round((completados / total) * 100))
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/90">Avance del checklist</span>
        <span className="tabular-nums font-medium text-foreground/80">
          {completados}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={completados}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  )
}

/** Indicador compacto para tarjetas Kanban, tablas, etc. */
export function AccionChecklistProgressBadge({
  completados,
  total,
  className,
}: {
  completados: number
  total: number
  className?: string
}) {
  if (total === 0) return null
  const allDone = completados >= total
  const pend = total - completados
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
        allDone
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
          : 'border-amber-500/25 bg-amber-500/8 text-amber-900 dark:text-amber-200/90',
        className
      )}
      title={
        allDone
          ? `Checklist completo (${completados}/${total})`
          : `Checklist ${completados}/${total} · ${pend} pendiente(s) para poder marcar Hecho`
      }
      aria-label={
        allDone
          ? `Checklist completo, ${completados} de ${total}`
          : `Checklist ${completados} de ${total} completados`
      }
    >
      <ListChecks className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {completados}/{total}
    </span>
  )
}
