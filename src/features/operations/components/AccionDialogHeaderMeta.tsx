import type { AccionDiaria } from '@/types'
import { cn } from '@/lib/utils'
import { AccionIdDisplay } from './AccionIdDisplay'
import { accionIdPublico } from '../utils/accionUtils'
import {
  accionEstadoBadgeClass,
  accionEstadoLabel,
  getAccionDisplayEstado,
} from '../utils/accionEstadoDisplay'
import { AccionPriorityBadge } from './AccionPriorityBadge'
import { usePriorities } from '@/features/catalogs/hooks/usePriorities'
import {
  findPriorityForAccion,
  resolveAccionPrioridadNombre,
} from '../utils/resolveAccionPrioridad'

type AccionDialogHeaderMetaProps = {
  accion: AccionDiaria
  /** Prioridad mostrada (p. ej. valor actual del formulario al editar). */
  prioridadNombre?: string | null
  className?: string
}

/** ID público y estado legible para el encabezado del modal de acción. */
export function AccionDialogHeaderMeta({
  accion,
  prioridadNombre,
  className,
}: AccionDialogHeaderMetaProps) {
  const displayEstado = getAccionDisplayEstado(accion)
  const estadoLabel = accionEstadoLabel(displayEstado)
  const { data: priorities = [] } = usePriorities()
  const prioridad = resolveAccionPrioridadNombre(
    {
      prioridad: (prioridadNombre ?? accion.prioridad) ?? '',
      prioridad_id: accion.prioridad_id,
    },
    priorities
  ).trim()
  const catalogColor = findPriorityForAccion(
    { prioridad: accion.prioridad, prioridad_id: accion.prioridad_id },
    priorities
  )?.color

  return (
    <div
      className={cn(
        'inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2 py-1',
        className
      )}
      aria-label={`Acción ${accionIdPublico(accion.id)}, estado ${estadoLabel}${prioridad ? `, prioridad ${prioridad}` : ''}`}
    >
      <AccionIdDisplay
        id={accion.id}
        variant="compact"
        className="truncate text-xs font-semibold tabular-nums text-foreground"
      />
      <span className="h-3 w-px shrink-0 bg-border/80" aria-hidden />
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
          accionEstadoBadgeClass(displayEstado)
        )}
      >
        {estadoLabel}
      </span>
      {prioridad ? (
        <>
          <span className="h-3 w-px shrink-0 bg-border/80" aria-hidden />
          <AccionPriorityBadge
            prioridad={prioridad}
            catalogColor={catalogColor}
            compact
            className="max-w-[9rem]"
          />
        </>
      ) : null}
    </div>
  )
}
