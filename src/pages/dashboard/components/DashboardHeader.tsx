/**
 * Centro de control — cabecera del dashboard: título breve, CTA principal y acciones secundarias en fila.
 */

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Plus,
  // Download,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DashboardHeaderProps {
  filtersExpanded?: boolean
  /** Hay filtros activos (búsqueda, fechas, estado, etc.). */
  advancedFiltersActive?: boolean
  title?: string
  eyebrow?: string
  onToggleFilters?: () => void
  onNewAction?: () => void
  /** Panel de filtros (se muestra al expandir «Más filtros»). */
  filtersPanel?: ReactNode
  className?: string
}

const ACTION_BTN =
  'h-11 min-h-11 w-full min-w-0 justify-center gap-1.5 px-2 text-[11px] font-semibold leading-tight shadow-sm sm:h-10 sm:min-h-10 sm:w-auto sm:min-w-[5.5rem] sm:gap-2 sm:px-3 sm:text-sm'

const SECONDARY_ACTION_BTN =
  'border-2 border-border bg-card font-semibold text-foreground shadow-sm hover:bg-muted/60 hover:text-foreground'

const PRIMARY_ACTION_BTN =
  'flex-col gap-0.5 sm:flex-row sm:gap-2 shadow-md ring-2 ring-primary/25'

export function DashboardHeader({
  filtersExpanded,
  advancedFiltersActive,
  title = 'Vista general O2C',
  eyebrow = 'Tablero ejecutivo',
  onToggleFilters,
  onNewAction,
  filtersPanel,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      id="dashboard-header"
      className={cn('dashboard-header min-w-0 space-y-2.5', className)}
    >
      <div className="dashboard-header-title-area min-w-0 max-w-2xl space-y-1 sm:space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
        <h1
          id="dashboard-title"
          className="dashboard-title text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {title}
        </h1>
        <p className="dashboard-subtitle text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Crea acciones, revisa el tablero y ajusta el alcance temporal sin perder contexto.
        </p>
      </div>

      <div
        className={cn(
          'dashboard-header-actions grid w-full min-w-0 grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm ring-1 ring-border/30 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:p-3'
        )}
      >
        {onNewAction ? (
          <Button
            id="dashboard-btn-new-action"
            variant="default"
            size="sm"
            className={cn('dashboard-btn-new-action', ACTION_BTN, PRIMARY_ACTION_BTN)}
            onClick={onNewAction}
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span className="truncate sm:hidden">Crear</span>
            <span className="hidden truncate sm:inline">Crear acción</span>
          </Button>
        ) : null}

        {/* Exportar — deshabilitado temporalmente
        {showExport ? (
          <Button id="dashboard-btn-export" ...>
            <Download />
            Exportar
          </Button>
        ) : null}
        */}

        {onToggleFilters ? (
          <Button
            id="dashboard-btn-filters"
            className={cn(
              'dashboard-btn-filters relative flex-col gap-0.5 sm:flex-row sm:gap-2',
              ACTION_BTN,
              SECONDARY_ACTION_BTN,
              filtersExpanded && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
              advancedFiltersActive &&
                !filtersExpanded &&
                'border-primary/50 bg-primary/5 text-primary ring-2 ring-primary/15'
            )}
            variant={filtersExpanded ? 'secondary' : 'outline'}
            size="sm"
            onClick={onToggleFilters}
            aria-expanded={filtersExpanded}
            aria-controls="dashboard-toolbar"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0 stroke-[2.25]" />
            <span className="truncate sm:hidden">Filtros</span>
            <span className="hidden truncate sm:inline">
              {filtersExpanded ? 'Ocultar filtros' : 'Más filtros'}
            </span>
            {advancedFiltersActive ? (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full border border-card bg-primary shadow-sm sm:-right-0.5 sm:-top-0.5 sm:h-2.5 sm:w-2.5 sm:border-2"
                aria-label="Filtros activos"
              />
            ) : null}
          </Button>
        ) : null}
      </div>

      {filtersExpanded && filtersPanel ? (
        <div
          id="dashboard-toolbar"
          className="dashboard-toolbar-wrapper rounded-xl border border-border/60 bg-muted/10 p-2.5 shadow-sm ring-1 ring-border/30 sm:p-3"
          role="region"
          aria-label="Filtros del tablero"
        >
          {filtersPanel}
        </div>
      ) : null}
    </header>
  )
}
