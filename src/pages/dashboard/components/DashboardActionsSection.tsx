/**
 * Sección "Control de acciones" con header refinado y tabla.
 */

import { ClipboardList } from 'lucide-react'
import { AccionesControlTable } from '@/features/operations'
import type { AccionDiaria } from '@/types'

export interface DashboardActionsSectionProps {
  acciones: AccionDiaria[]
  isLoading?: boolean
  commentCounts?: Record<string, number>
  responsableNames?: Record<string, string>
  checklistProgressByAccionId?: Record<string, { total: number; completed: number }>
  onSelectAccion?: (accion: AccionDiaria) => void
  onNewAction?: () => void
}

export function DashboardActionsSection({
  acciones,
  isLoading,
  commentCounts = {},
  responsableNames = {},
  checklistProgressByAccionId = {},
  onSelectAccion,
  onNewAction,
}: DashboardActionsSectionProps) {
  return (
    <div id="dashboard-actions-section" className="dashboard-actions-section rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="dashboard-actions-section-header border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 id="dashboard-actions-title" className="text-sm font-semibold text-foreground">
              Control de acciones
            </h2>
            <p className="text-xs text-muted-foreground">
              Lista filtrable. Clic en una fila para editar.
            </p>
          </div>
        </div>
      </div>
      <div className="dashboard-actions-section-body p-0">
        <AccionesControlTable
          acciones={acciones}
          isLoading={isLoading}
          commentCounts={commentCounts}
          onSelectAccion={onSelectAccion}
          responsableNames={responsableNames}
          checklistProgressByAccionId={checklistProgressByAccionId}
          emptyMessage="No hay acciones registradas para esta fecha."
          emptyActionLabel="Crear acción"
          onEmptyAction={onNewAction}
        />
      </div>
    </div>
  )
}
