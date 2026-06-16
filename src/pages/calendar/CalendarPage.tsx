import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { CalendarView, type CalendarFilters } from '@/features/calendar'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { AccionDiaria } from '@/types'
import { CalendarFiltersBar, hasCalendarActiveFilters } from './components/CalendarFiltersBar'
import { ROUTES } from '@/constants'

function isCalendarItemType(value: string | null): value is NonNullable<CalendarFilters['itemType']> {
  return value === 'todos' || value === 'acciones' || value === 'recordatorios' || value === 'minutas'
}

function isDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fechaParam = searchParams.get('fecha')
  const initialDate = isDateParam(fechaParam) ? fechaParam : null
  const tipoParam = searchParams.get('tipo')
  const initialItemType = isCalendarItemType(tipoParam) ? tipoParam : undefined
  const { data: users = [] } = useUsers({ activo: true })
  const [filters, setFilters] = useState<CalendarFilters>(() => ({
    itemType: initialItemType,
  }))
  const [filtersExpanded, setFiltersExpanded] = useState(
    () => Boolean(initialItemType) || Boolean(fechaParam)
  )

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((user) => {
      map[user.id] = user.nombre
    })
    return map
  }, [users])

  const handleSelectAccion = useCallback((accion: AccionDiaria) => {
    navigate(`${ROUTES.KANBAN}?accion=${accion.id}`)
  }, [navigate])

  const hasFilters = hasCalendarActiveFilters(filters)

  return (
    <div
      id="calendar-page"
      className="calendar-page mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6"
    >
      <header id="calendar-header" className="calendar-header space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Planificación
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Calendario
        </h1>
        <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
          Acciones, recordatorios y minutas por día. Toca un día para ver el detalle.
        </p>
      </header>

      <SectionCard className="calendar-main-card">
        <SectionCardHeader
          className="px-3 py-3 sm:px-4 sm:py-4 md:px-6"
          title="Vista mensual"
          subtitle="Navega por mes y gestiona el día seleccionado."
        />
        <SectionCardBody className="p-0">
          <CalendarView
            responsableNames={responsableNames}
            onSelectAccion={handleSelectAccion}
            filters={filters}
            initialSelectedDate={initialDate}
            filtersExpanded={filtersExpanded}
            onToggleFilters={() => setFiltersExpanded((v) => !v)}
            hasActiveFilters={hasFilters}
            filterBar={
              <CalendarFiltersBar filters={filters} onFiltersChange={setFilters} />
            }
          />
        </SectionCardBody>
      </SectionCard>
    </div>
  )
}
