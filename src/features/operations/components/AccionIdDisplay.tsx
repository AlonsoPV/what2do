import { cn } from '@/lib/utils'
import { accionIdPublico } from '../utils/accionUtils'

export interface AccionIdDisplayProps {
  id: string
  /** compact: solo `emx_XXXXX`; full: código público + UUID en línea inferior (copiar). */
  variant?: 'compact' | 'full'
  className?: string
}

export function AccionIdDisplay({ id, variant = 'compact', className }: AccionIdDisplayProps) {
  const publico = accionIdPublico(id)
  if (variant === 'full') {
    return (
      <span
        className={cn(
          'inline-block font-mono text-[11px] tabular-nums text-muted-foreground select-all',
          className
        )}
        title={id}
      >
        <span className="text-foreground/90">{publico}</span>
        <span className="block break-all text-[10px] opacity-80 mt-0.5 font-normal">{id}</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-block font-mono text-[11px] tabular-nums text-muted-foreground select-all',
        className
      )}
      title={`ID técnico: ${id}`}
    >
      {publico}
    </span>
  )
}
