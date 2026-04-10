import { FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EvidenciaCargadaIndicatorProps {
  cargada: boolean
  /** Solo icono + tooltip; si es false, no renderiza nada. */
  compact?: boolean
  className?: string
}

/** Badge verde cuando la acción tiene evidencia adjunta cargada. */
export function EvidenciaCargadaIndicator({
  cargada,
  compact = true,
  className,
}: EvidenciaCargadaIndicatorProps) {
  if (!cargada) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400',
        className
      )}
      title="Evidencia cargada"
      aria-label="Evidencia cargada"
    >
      <FileCheck className="h-3 w-3 shrink-0" aria-hidden />
      {!compact && <span>Evidencia</span>}
    </span>
  )
}
