/**
 * Vista de calendario mensual (spec §5.6).
 * Acciones por fecha, navegación por mes, detalle al seleccionar día.
 */

import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAcciones } from '@/features/operations/hooks/useAcciones'
import { addCalendarDays, dateOnlyCDMX, monthName } from '@/lib/dateUtils'
import type { AccionDiaria } from '@/types'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { AccionIdDisplay, EvidenciaCargadaIndicator } from '@/features/operations'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export interface CalendarViewProps {
  /** Nombres de responsables para mostrar en listados. */
  responsableNames?: Record<string, string>
  /** Callback al seleccionar una acción (ej. abrir en Kanban). */
  onSelectAccion?: (accion: AccionDiaria) => void
}

/** Devuelve año y mes actuales (1-12). */
function currentYearMonth(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/** Día de la semana para "lunes primero" (0 = lunes, 6 = domingo). */
function weekdayMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** Genera los días a mostrar en la grilla del mes (incluye padding de días anteriores/posteriores). */
function getCalendarDays(year: number, month: number): { date: string; isCurrentMonth: boolean; day: number }[] {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const startPad = weekdayMondayFirst(first)
  const daysInMonth = last.getDate()
  const totalCells = 42
  const result: { date: string; isCurrentMonth: boolean; day: number }[] = []

  if (startPad > 0) {
    const prevDate = new Date(year, month - 2, 1)
    const prevYear = prevDate.getFullYear()
    const prevMonth = prevDate.getMonth() + 1
    const prevLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = 0; i < startPad; i++) {
      const day = prevLastDay - startPad + 1 + i
      result.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        day,
      })
    }
  }

  for (let i = 1; i <= daysInMonth; i++) {
    result.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: true,
      day: i,
    })
  }

  const remaining = totalCells - result.length
  const nextDate = new Date(year, month, 1)
  const nextYear = nextDate.getFullYear()
  const nextMonth = nextDate.getMonth() + 1
  for (let i = 1; i <= remaining; i++) {
    result.push({
      date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: false,
      day: i,
    })
  }

  return result.slice(0, totalCells)
}

/**
 * Cada acción no verificada se muestra en todos los días desde su creación (CDMX) hasta el fin del rango visible,
 * mientras siga activa (no viene en lista si ya está Verificado).
 */
function expandAccionesPorDiasVisibles(
  acciones: AccionDiaria[],
  gridFirstDate: string,
  gridLastDate: string
): Record<string, AccionDiaria[]> {
  const map: Record<string, AccionDiaria[]> = {}
  for (const a of acciones) {
    if (a.estado === 'Verificado') continue
    const created = dateOnlyCDMX(a.created_at)
    const from = created > gridFirstDate ? created : gridFirstDate
    if (from > gridLastDate) continue
    let d = from
    while (d <= gridLastDate) {
      if (!map[d]) map[d] = []
      map[d].push(a)
      d = addCalendarDays(d, 1)
    }
  }
  for (const key of Object.keys(map)) {
    map[key].sort((x, y) => (x.hora_limite || '').localeCompare(y.hora_limite || ''))
  }
  return map
}

export function CalendarView({ responsableNames = {}, onSelectAccion }: CalendarViewProps) {
  const navigate = useNavigate()
  const [view, setView] = useState(currentYearMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const calendarDays = useMemo(
    () => getCalendarDays(view.year, view.month),
    [view.year, view.month]
  )

  const gridFirstDate = calendarDays[0]?.date ?? ''
  const gridLastDate = calendarDays[calendarDays.length - 1]?.date ?? ''

  const { data: acciones = [], isLoading } = useAcciones({
    calendario_creadas_hasta: gridLastDate || undefined,
    excluir_estados: ['Verificado'],
  })

  const actionsByDate = useMemo(() => {
    if (!gridFirstDate || !gridLastDate) return {}
    return expandAccionesPorDiasVisibles(acciones, gridFirstDate, gridLastDate)
  }, [acciones, gridFirstDate, gridLastDate])

  const goPrev = useCallback(() => {
    setView((v) => {
      if (v.month === 1) return { year: v.year - 1, month: 12 }
      return { year: v.year, month: v.month - 1 }
    })
  }, [])
  const goNext = useCallback(() => {
    setView((v) => {
      if (v.month === 12) return { year: v.year + 1, month: 1 }
      return { year: v.year, month: v.month + 1 }
    })
  }, [])
  const goToday = useCallback(() => {
    setView(currentYearMonth())
    setSelectedDate(null)
  }, [])

  const todayStr = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  const selectedActions = selectedDate ? (actionsByDate[selectedDate] ?? []) : []

  return (
    <div className="relative space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="min-w-[180px] text-center text-lg font-semibold capitalize">
            {monthName(view.year, view.month)} {view.year}
          </h3>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>
          <CalendarIcon className="mr-1.5 h-4 w-4" />
          Hoy
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth, day }) => {
            const count = (actionsByDate[date] ?? []).length
            const isToday = date === todayStr
            const isSelected = date === selectedDate
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'min-h-[88px] border-b border-r border-border/50 p-2 text-left transition-colors',
                  'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                  !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                  isToday && 'ring-2 ring-primary/40 ring-inset bg-primary/5',
                  isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && isCurrentMonth && 'text-foreground',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {day}
                </span>
                {count > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {count}
                    </span>
                    <span className="text-muted-foreground text-xs">acciones</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <List className="h-4 w-4" />
              Acciones del {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${ROUTES.KANBAN}?fecha=${selectedDate}`)}
            >
              Ver en Kanban
            </Button>
          </div>
          {selectedActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin acciones este día.</p>
          ) : (
            <ul className="space-y-2">
              {selectedActions.map((accion) => (
                <li
                  key={accion.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-medium text-foreground" title={accion.descripcion_accion}>
                        {accion.titulo_accion?.trim() || accion.descripcion_accion}
                      </p>
                      <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} className="shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID <AccionIdDisplay id={accion.id} className="inline align-baseline" /> ·{' '}
                      {accion.hora_limite?.slice(0, 5) ?? '—'} · {responsableNames[accion.responsable] ?? accion.responsable ?? '—'} · {accion.estado}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onSelectAccion) onSelectAccion(accion)
                      else navigate(`${ROUTES.KANBAN}?accion=${accion.id}`)
                    }}
                  >
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}
