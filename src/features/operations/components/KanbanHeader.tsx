/**
 * Encabezado del módulo Kanban — jerarquía clara y layout responsivo.
 */

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, LayoutGrid, SlidersHorizontal, List, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KanbanViewMode = 'kanban' | 'lista'

export interface KanbanHeaderProps {
  filtersExpanded?: boolean
  onToggleFilters?: () => void
  /** Muestra indicador cuando hay filtros aplicados (incl. responsable por defecto). */
  hasActiveFilters?: boolean
  onNewAction?: () => void
  viewMode?: KanbanViewMode
  onViewModeChange?: (mode: KanbanViewMode) => void
  rightOfTitle?: React.ReactNode
  className?: string
}

const VIEW_LABELS: Record<KanbanViewMode, string> = {
  kanban: 'Tablero Kanban',
  lista: 'Lista',
}

const ACTION_BTN =
  'h-11 min-h-11 w-full min-w-0 justify-center gap-1.5 px-2 text-[11px] font-semibold leading-tight shadow-sm sm:h-10 sm:min-h-10 sm:w-auto sm:min-w-[6rem] sm:gap-2 sm:px-4 sm:text-sm'

const SECONDARY_ACTION_BTN =
  'border-2 border-border bg-card font-semibold text-foreground shadow-sm hover:bg-muted/60 hover:text-foreground'

const PRIMARY_ACTION_BTN =
  'flex-col gap-0.5 sm:flex-row sm:gap-2 shadow-md ring-2 ring-primary/25'

export function KanbanHeader({
  filtersExpanded,
  onToggleFilters,
  hasActiveFilters = false,
  onNewAction,
  viewMode = 'kanban',
  onViewModeChange,
  rightOfTitle,
  className,
}: KanbanHeaderProps) {
  return (
    <header
      id="kanban-header"
      className={cn('kanban-header flex min-w-0 flex-col gap-2.5', className)}
    >
      <div className="kanban-header-title-area min-w-0 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Operaciones
        </p>

        <div className="grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:items-start md:gap-x-4 lg:gap-x-5">
          <h1
            id="kanban-title"
            className="kanban-title text-xl font-semibold tracking-tight text-foreground md:pt-0.5 md:text-2xl"
          >
            Kanban
          </h1>
          {rightOfTitle ? (
            <div className="kanban-header-right-slot min-w-0 w-full md:max-w-none lg:max-w-md">
              {rightOfTitle}
            </div>
          ) : null}
        </div>

        <p className="kanban-subtitle max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {viewMode === 'kanban'
            ? 'Gestiona acciones por estado. Arrastra tarjetas entre columnas.'
            : 'Vista en lista. Toca una fila para editar la acción.'}
        </p>

        <div
          className={cn(
            'kanban-header-actions grid w-full min-w-0 grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm ring-1 ring-border/30 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:p-3'
          )}
        >
          {onNewAction ? (
            <Button
              id="kanban-btn-new-action"
              variant="default"
              className={cn('kanban-btn-new-action', ACTION_BTN, PRIMARY_ACTION_BTN)}
              onClick={onNewAction}
              size="sm"
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5] sm:h-4 sm:w-4" />
              <span className="truncate sm:hidden">Nueva</span>
              <span className="hidden truncate sm:inline">Nueva acción</span>
            </Button>
          ) : null}

          {onToggleFilters ? (
            <Button
              id="kanban-btn-filters"
              className={cn(
                'kanban-btn-filters relative flex-col gap-0.5 sm:flex-row sm:gap-2',
                ACTION_BTN,
                SECONDARY_ACTION_BTN,
                filtersExpanded && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
                hasActiveFilters &&
                  !filtersExpanded &&
                  'border-primary/50 bg-primary/5 text-primary ring-2 ring-primary/15'
              )}
              variant={filtersExpanded ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggleFilters}
              aria-expanded={filtersExpanded}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0 stroke-[2.25]" />
              <span className="truncate">Filtros</span>
              {hasActiveFilters ? (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full border border-card bg-primary shadow-sm sm:-right-0.5 sm:-top-0.5 sm:h-2.5 sm:w-2.5 sm:border-2"
                  aria-label="Filtros activos"
                />
              ) : null}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="kanban-btn-view"
                className={cn(
                  'kanban-btn-view flex-col gap-0.5 sm:flex-row sm:gap-2',
                  ACTION_BTN,
                  SECONDARY_ACTION_BTN
                )}
                variant="outline"
                size="sm"
              >
                {viewMode === 'kanban' ? (
                  <LayoutGrid className="h-4 w-4 shrink-0 stroke-[2.25]" />
                ) : (
                  <List className="h-4 w-4 shrink-0 stroke-[2.25]" />
                )}
                <span className="truncate">Vista</span>
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem
                  onClick={() => onViewModeChange?.('kanban')}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    {VIEW_LABELS.kanban}
                  </span>
                  {viewMode === 'kanban' ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onViewModeChange?.('lista')}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    {VIEW_LABELS.lista}
                  </span>
                  {viewMode === 'lista' ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
