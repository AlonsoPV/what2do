/**
 * Centro de control — cabecera del dashboard: título breve, CTA principal y acciones secundarias en fila.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Download,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'

export interface DashboardHeaderProps {
  filtersExpanded?: boolean
  /** Hay estado, prioridad, área o responsable distinto de “todos”. */
  advancedFiltersActive?: boolean
  onToggleFilters?: () => void
  onNewAction?: () => void
  className?: string
}

export function DashboardHeader({
  filtersExpanded,
  advancedFiltersActive,
  onToggleFilters,
  onNewAction,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      id="dashboard-header"
      className={cn(
        'dashboard-header min-w-0 space-y-5',
        className
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="dashboard-header-title-area min-w-0 max-w-2xl space-y-1 sm:space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tablero ejecutivo
          </p>
          <h1
            id="dashboard-title"
            className="dashboard-title text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Vista general O2C
          </h1>
          <p className="dashboard-subtitle text-pretty text-sm leading-relaxed text-muted-foreground">
            Crea acciones, revisa el tablero y ajusta el alcance temporal sin perder contexto.
          </p>
        </div>

        <div className="dashboard-header-actions flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 lg:shrink-0">
          {onNewAction && (
            <Button
              id="dashboard-btn-new-action"
              variant="default"
              size="lg"
              className="dashboard-btn-new-action order-first h-12 w-full min-w-[11rem] px-6 text-base font-semibold shadow-md sm:order-none sm:w-auto"
              onClick={onNewAction}
            >
              <Plus className="h-5 w-5 shrink-0" strokeWidth={2.25} />
              Crear acción
            </Button>
          )}

          <div
            className="flex w-full items-center justify-start gap-2 border-t border-border/50 pt-3 sm:w-auto sm:justify-end sm:border-0 sm:pt-0"
            role="group"
            aria-label="Acciones secundarias"
          >
            <Button
              id="dashboard-btn-export"
              className="dashboard-btn-export h-10 shrink-0 gap-2 border-border/60 bg-background px-3 sm:h-9"
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 shrink-0" />
              Exportar
            </Button>
            <Button
              id="dashboard-btn-kanban"
              className="dashboard-btn-kanban h-10 shrink-0 gap-2 border-border/60 bg-background px-3 sm:h-9"
              variant="outline"
              size="sm"
              asChild
            >
              <Link to={ROUTES.KANBAN} className="gap-2">
                <LayoutGrid className="h-4 w-4 shrink-0" />
                Kanban
              </Link>
            </Button>
            {onToggleFilters && (
              <Button
                id="dashboard-btn-filters"
                className="dashboard-btn-filters relative h-10 shrink-0 gap-2 px-3 sm:h-9"
                variant={filtersExpanded ? 'secondary' : 'outline'}
                size="sm"
                onClick={onToggleFilters}
                aria-expanded={filtersExpanded}
                aria-controls="dashboard-toolbar"
                title={
                  advancedFiltersActive && !filtersExpanded
                    ? 'Hay filtros de estado, prioridad, área o responsable activos'
                    : undefined
                }
              >
                {advancedFiltersActive && !filtersExpanded && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
                    aria-hidden
                  />
                )}
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {filtersExpanded ? 'Ocultar filtros' : 'Más filtros'}
                </span>
                <span className="sm:hidden">Filtros</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
