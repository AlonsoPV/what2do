/**
 * Sección "Control de acciones" con header refinado y tabla.
 */

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, ChevronDown, ChevronUp, Rows3 } from 'lucide-react'
import { AccionesControlTable } from '@/features/operations'
import type { AccionDiaria } from '@/types'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const ACCIONES_VISTA_INICIAL = 10

export interface DashboardActionsSectionProps {
  acciones: AccionDiaria[]
  isLoading?: boolean
  commentCounts?: Record<string, number>
  responsableNames?: Record<string, string>
  checklistProgressByAccionId?: Record<string, { total: number; completed: number }>
  onSelectAccion?: (accion: AccionDiaria) => void
  onNewAction?: () => void
  /** Fecha activa del filtro (YYYY-MM-DD) para el subtítulo */
  fechaResumen: string
}

export function DashboardActionsSection({
  acciones,
  isLoading,
  commentCounts = {},
  responsableNames = {},
  checklistProgressByAccionId = {},
  onSelectAccion,
  onNewAction,
  fechaResumen,
}: DashboardActionsSectionProps) {
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setShowAll(false)
  }, [fechaResumen])

  const total = acciones.length
  const hasMore = total > ACCIONES_VISTA_INICIAL
  const ocultas = total - ACCIONES_VISTA_INICIAL

  const accionesVisibles = useMemo(() => {
    if (showAll || !hasMore) return acciones
    return acciones.slice(0, ACCIONES_VISTA_INICIAL)
  }, [acciones, showAll, hasMore])

  const subtitle = `${total} acción${total !== 1 ? 'es' : ''} · ${fechaResumen}`

  return (
    <div id="dashboard-actions-section" className="dashboard-actions-section">
      <SectionCard className="overflow-hidden">
        <SectionCardHeader
          icon={ClipboardList}
          eyebrow="Operación"
          title="Acciones del día"
          subtitle={subtitle}
          action={
            hasMore ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'font-medium tabular-nums',
                    showAll
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
                      : 'border-primary/20 bg-primary/10 text-primary'
                  )}
                >
                  {showAll ? (
                    <>Lista completa · {total}</>
                  ) : (
                    <>
                      Resumen · {ACCIONES_VISTA_INICIAL}/{total}
                    </>
                  )}
                </Badge>
              </div>
            ) : null
          }
        />
        <SectionCardBody className="p-0">
          <div className="relative">
            <AccionesControlTable
              acciones={accionesVisibles}
              isLoading={isLoading}
              commentCounts={commentCounts}
              onSelectAccion={onSelectAccion}
              responsableNames={responsableNames}
              checklistProgressByAccionId={checklistProgressByAccionId}
              emptyMessage="No hay acciones registradas para esta fecha."
              emptyActionLabel="Crear acción"
              onEmptyAction={onNewAction}
            />
            {hasMore && !showAll && !isLoading ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card from-30% via-card/70 to-transparent"
                aria-hidden
              />
            ) : null}
          </div>

          {hasMore && !isLoading ? (
            <div className="border-t border-border/50 bg-muted/25 px-4 py-3.5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="text-center text-sm text-muted-foreground sm:text-left">
                  {showAll ? (
                    <span>
                      Estás viendo las <span className="font-semibold text-foreground">{total}</span> acciones del
                      filtro actual.
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold text-foreground">{ocultas}</span> acción
                      {ocultas !== 1 ? 'es' : ''} más abajo en la lista.{' '}
                      <span className="hidden sm:inline">Despliega para revisarlas sin salir del tablero.</span>
                    </span>
                  )}
                </p>
                <Button
                  type="button"
                  variant={showAll ? 'outline' : 'default'}
                  size="sm"
                  className={cn(
                    'h-10 shrink-0 gap-2 sm:self-center',
                    !showAll && 'shadow-md shadow-primary/15'
                  )}
                  aria-expanded={showAll}
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? (
                    <>
                      <Rows3 className="h-4 w-4 opacity-90" aria-hidden />
                      Vista resumida ({ACCIONES_VISTA_INICIAL})
                      <ChevronUp className="h-4 w-4 opacity-80" aria-hidden />
                    </>
                  ) : (
                    <>
                      Mostrar todas
                      <span className="rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                        +{ocultas}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </SectionCardBody>
      </SectionCard>
    </div>
  )
}
