import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlarmClock,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Send,
  SlidersHorizontal,
  StickyNote,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/constants'
import { EvidenciaCargadaIndicator } from '@/features/operations'
import { useAcciones } from '@/features/operations/hooks/useAcciones'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { getAppNow } from '@/lib/clock'
import { addCalendarDays, dateOnlyCDMX, todayWallClockCDMX, wallClockDatetimeLocalAhead } from '@/lib/dateUtils'
import {
  validateFutureDatetimeLocalWallClock,
  validateTodayOrFutureDateCDMX,
} from '@/lib/futureDateValidation'
import { cn } from '@/lib/utils'
import { accionComentariosService } from '@/services/accionComentarios.service'
import { accionesService } from '@/services/acciones.service'
import { calendarNotesService, type CalendarNote } from '@/services/calendarNotes.service'
import { calendarRemindersService, type CalendarReminder } from '@/services/calendarReminders.service'
import type { AccionComentarioVisibility } from '@/services/accionComentarios.service'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Calendario: acciones activas = cualquier estado excepto Verificado. */
const CALENDAR_EXCLUDED_STATUSES: ActionStatus[] = ['Verificado']

type CalendarDayTab = 'acciones' | 'recordatorios' | 'minutas'

export interface CalendarFilters {
  area?: string
  responsable?: string
  estado?: ActionStatus
  itemType?: 'todos' | 'acciones' | 'recordatorios' | 'minutas'
}

export interface CalendarViewProps {
  responsableNames?: Record<string, string>
  onSelectAccion?: (accion: AccionDiaria) => void
  filters?: CalendarFilters
  initialSelectedDate?: string | null
  filtersExpanded?: boolean
  onToggleFilters?: () => void
  hasActiveFilters?: boolean
  filterBar?: ReactNode
}

function weekdayMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7
}

const CALENDAR_VISIBLE_WEEKS = 4
const CALENDAR_VISIBLE_DAYS = CALENDAR_VISIBLE_WEEKS * 7

function mondayOfWeekContaining(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - weekdayMondayFirst(date))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function defaultGridStartDate(): string {
  return mondayOfWeekContaining(todayWallClockCDMX())
}

function getCalendarDays(gridStartYmd: string): { date: string; day: number }[] {
  const result: { date: string; day: number }[] = []
  for (let i = 0; i < CALENDAR_VISIBLE_DAYS; i += 1) {
    const date = addCalendarDays(gridStartYmd, i)
    const day = Number(date.split('-')[2])
    result.push({ date, day })
  }
  return result
}

function formatCalendarPeriodLabel(
  startYmd: string,
  endYmd: string
): { primary: string; secondary: string; dateTime: string } {
  const start = new Date(`${startYmd}T12:00:00`)
  const end = new Date(`${endYmd}T12:00:00`)
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  const startMonth = start.getMonth()
  const endMonth = end.getMonth()
  const startDay = start.getDate()
  const endDay = end.getDate()

  const dayMonth = (date: Date) =>
    date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  let primary: string
  if (startYear === endYear && startMonth === endMonth) {
    const month = start.toLocaleDateString('es-MX', { month: 'short' })
    primary = `${startDay} – ${endDay} ${month}`
  } else {
    primary = `${dayMonth(start)} – ${dayMonth(end)}`
  }

  const secondary = startYear === endYear ? String(startYear) : `${startYear} – ${endYear}`

  return {
    primary,
    secondary,
    dateTime: `${startYmd}/${endYmd}`,
  }
}

function isTaggedInComment(comment: AccionComentarioVisibility, userId: string): boolean {
  return comment.asignado === userId || comment.etiquetas?.includes(userId)
}

function filterAccionesByCalendarVisibility(
  acciones: AccionDiaria[],
  comments: AccionComentarioVisibility[],
  currentUserId: string | null | undefined
): AccionDiaria[] {
  if (!currentUserId) return []

  const taggedActionIds = new Set(
    comments
      .filter((comment) => isTaggedInComment(comment, currentUserId))
      .map((comment) => comment.accion_id)
  )

  return acciones.filter(
    (accion) =>
      accion.created_by === currentUserId ||
      accion.responsable === currentUserId ||
      taggedActionIds.has(accion.id)
  )
}

/** Fecha/hora por defecto al crear recordatorio: ahora real + 30 min en hora local. */
function defaultReminderDeadline(): string {
  return wallClockDatetimeLocalAhead(30)
}

function dateOnlyFromReminder(reminder: CalendarReminder): string {
  return dateOnlyCDMX(reminder.fecha_limite)
}

function shouldShowCalendarItem(
  itemType: CalendarFilters['itemType'],
  item: 'acciones' | 'recordatorios' | 'minutas'
): boolean {
  return !itemType || itemType === 'todos' || itemType === item
}

function calendarFilterLabel(itemType: CalendarFilters['itemType']): string {
  if (itemType === 'recordatorios') return 'recordatorios'
  if (itemType === 'minutas') return 'minutas'
  if (itemType === 'acciones') return 'acciones'
  return 'elementos'
}

function formatReminderDateTime(value: string): string {
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CalendarView({
  responsableNames = {},
  onSelectAccion,
  filters = {},
  initialSelectedDate = null,
  filtersExpanded = false,
  onToggleFilters,
  hasActiveFilters = false,
  filterBar,
}: CalendarViewProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const [gridStartDate, setGridStartDate] = useState(() =>
    initialSelectedDate ? mondayOfWeekContaining(initialSelectedDate) : defaultGridStartDate()
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDeadline, setReminderDeadline] = useState(defaultReminderDeadline)
  const [reminderDescription, setReminderDescription] = useState('')
  const [mobileDayTab, setMobileDayTab] = useState<CalendarDayTab>('acciones')
  const dayDetailRef = useRef<HTMLDivElement | null>(null)
  const shouldScrollToDetailRef = useRef(false)

  const calendarDays = useMemo(() => getCalendarDays(gridStartDate), [gridStartDate])
  const gridFirstDate = calendarDays[0]?.date ?? ''
  const gridLastDate = calendarDays[calendarDays.length - 1]?.date ?? ''
  const showActions = shouldShowCalendarItem(filters.itemType, 'acciones')
  const showReminders = shouldShowCalendarItem(filters.itemType, 'recordatorios')
  const showNotes = shouldShowCalendarItem(filters.itemType, 'minutas')
  const calendarPeriod = useMemo(
    () => formatCalendarPeriodLabel(gridFirstDate, gridLastDate),
    [gridFirstDate, gridLastDate]
  )

  useEffect(() => {
    if (!initialSelectedDate) return
    setSelectedDate(initialSelectedDate)
    setGridStartDate(mondayOfWeekContaining(initialSelectedDate))
  }, [initialSelectedDate])

  const accionesFilter = useMemo<AccionesFilter>(
    () => ({
      calendario_creadas_hasta: selectedDate || undefined,
      excluir_estados: CALENDAR_EXCLUDED_STATUSES,
      area: showActions ? filters.area : undefined,
      responsable: showActions ? filters.responsable : undefined,
      estado: showActions ? filters.estado : undefined,
    }),
    [filters.area, filters.estado, filters.responsable, selectedDate, showActions]
  )

  const { data: actionCountsByDate = {}, isLoading: actionCountsLoading } = useQuery({
    queryKey: [
      'calendar-action-counts',
      currentUser?.id ?? '',
      gridFirstDate,
      gridLastDate,
      showActions ? filters.area ?? '' : '',
      showActions ? filters.responsable ?? '' : '',
      showActions ? filters.estado ?? '' : '',
    ],
    queryFn: () =>
      accionesService.calendarCountsByDay({
        usuarioId: currentUser!.id,
        from: gridFirstDate,
        to: gridLastDate,
        area: filters.area,
        responsable: filters.responsable,
        estado: filters.estado,
      }),
    enabled: Boolean(currentUser?.id && gridFirstDate && gridLastDate && showActions),
    staleTime: 2 * 60_000,
  })

  const { data: acciones = [], isLoading } = useAcciones(accionesFilter, {
    enabled: Boolean(currentUser?.id && selectedDate && showActions),
  })

  const actionIds = useMemo(() => acciones.map((accion) => accion.id), [acciones])
  const {
    data: calendarComments = [],
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ['calendar-action-comments', currentUser?.id ?? '', actionIds],
    queryFn: () => accionComentariosService.listVisibilityByAccionIds(actionIds),
    enabled: Boolean(currentUser?.id && showActions && actionIds.length > 0),
    staleTime: 2 * 60_000,
  })

  const visibleAcciones = useMemo(
    () =>
      filterAccionesByCalendarVisibility(acciones, calendarComments, currentUser?.id).filter(
        (accion) => !CALENDAR_EXCLUDED_STATUSES.includes(accion.estado)
      ),
    [acciones, calendarComments, currentUser?.id]
  )

  const notesQueryKey = ['calendar-notes', currentUser?.id ?? '', gridFirstDate, gridLastDate] as const
  const {
    data: notes = [],
    isLoading: notesLoading,
    isError: notesError,
  } = useQuery({
    queryKey: notesQueryKey,
    queryFn: () => calendarNotesService.listByRange(currentUser!.id, gridFirstDate, gridLastDate),
    enabled: Boolean(currentUser?.id && gridFirstDate && gridLastDate),
    staleTime: 30_000,
  })

  const resetNoteDialog = useCallback(() => {
    setEditingNote(null)
    setNoteTitle('')
    setNoteText('')
    setNoteDialogOpen(false)
  }, [])

  const createNote = useMutation({
    mutationFn: calendarNotesService.create,
    onSuccess: () => {
      resetNoteDialog()
      void queryClient.invalidateQueries({ queryKey: ['calendar-notes'] })
      toast.success('Minuta creada')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo crear la minuta'),
  })

  const updateNote = useMutation({
    mutationFn: ({
      id,
      titulo,
      texto,
    }: {
      id: string
      titulo: string
      texto: string
    }) => calendarNotesService.update(id, { titulo, texto }),
    onSuccess: () => {
      resetNoteDialog()
      void queryClient.invalidateQueries({ queryKey: ['calendar-notes'] })
      toast.success('Minuta actualizada')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la minuta'),
  })

  const handleNoteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetNoteDialog()
      else setNoteDialogOpen(true)
    },
    [resetNoteDialog]
  )

  const remindersQueryKey = ['calendar-reminders', currentUser?.id ?? '', gridFirstDate, gridLastDate] as const
  const {
    data: reminders = [],
    isLoading: remindersLoading,
    isError: remindersError,
  } = useQuery({
    queryKey: remindersQueryKey,
    queryFn: () => calendarRemindersService.listByRange(currentUser!.id, gridFirstDate, gridLastDate),
    enabled: Boolean(currentUser?.id && gridFirstDate && gridLastDate),
    staleTime: 30_000,
  })

  const createReminder = useMutation({
    mutationFn: calendarRemindersService.create,
    onSuccess: () => {
      setReminderTitle('')
      setReminderDescription('')
      setReminderDeadline(defaultReminderDeadline())
      setReminderDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      toast.success('Recordatorio creado')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo crear el recordatorio'),
  })

  const completeReminder = useMutation({
    mutationFn: (id: string) => calendarRemindersService.complete(id, currentUser!.id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders-due'] })
      if (!result.googleSynced && result.googleMessage) {
        toast.success('Recordatorio cerrado en SCRUMBAN', {
          description: `Google no se actualizó: ${result.googleMessage}`,
        })
        return
      }
      if (result.reminder.google_calendar_event_id || result.reminder.google_task_id) {
        toast.success('Recordatorio cerrado y sincronizado con Google')
        return
      }
      toast.success('Recordatorio cerrado')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo cerrar el recordatorio'),
  })

  const notesByDate = useMemo(() => {
    const map: Record<string, CalendarNote[]> = {}
    for (const note of notes) {
      if (!map[note.fecha]) map[note.fecha] = []
      map[note.fecha].push(note)
    }
    return map
  }, [notes])

  const remindersByDate = useMemo(() => {
    const map: Record<string, CalendarReminder[]> = {}
    for (const reminder of reminders) {
      const day = dateOnlyFromReminder(reminder)
      if (!map[day]) map[day] = []
      map[day].push(reminder)
    }
    return map
  }, [reminders])

  const goPrev = useCallback(() => {
    setGridStartDate((current) => addCalendarDays(current, -CALENDAR_VISIBLE_DAYS))
  }, [])

  const goNext = useCallback(() => {
    setGridStartDate((current) => addCalendarDays(current, CALENDAR_VISIBLE_DAYS))
  }, [])

  const goToday = useCallback(() => {
    setGridStartDate(defaultGridStartDate())
    setSelectedDate(null)
  }, [])

  const todayStr = useMemo(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }, [])

  const selectedActions = selectedDate && showActions ? visibleAcciones : []
  const selectedNotes = selectedDate ? (notesByDate[selectedDate] ?? []) : []
  const selectedReminders = selectedDate ? (remindersByDate[selectedDate] ?? []) : []
  const hasTypeFilter = Boolean(filters.itemType && filters.itemType !== 'todos')

  const visibleDayTabs = useMemo(() => {
    const tabs: CalendarDayTab[] = []
    if (showNotes) tabs.push('minutas')
    if (showReminders) tabs.push('recordatorios')
    if (showActions) tabs.push('acciones')
    return tabs
  }, [showActions, showNotes, showReminders])

  useEffect(() => {
    if (visibleDayTabs.length === 0) return
    if (!visibleDayTabs.includes(mobileDayTab)) {
      setMobileDayTab(visibleDayTabs[0])
    }
  }, [selectedDate, visibleDayTabs, mobileDayTab])

  useEffect(() => {
    if (!selectedDate || !shouldScrollToDetailRef.current) return
    shouldScrollToDetailRef.current = false
    window.setTimeout(() => {
      dayDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }, [selectedDate])

  const selectDateAndScroll = useCallback((date: string) => {
    shouldScrollToDetailRef.current = true
    if (date === selectedDate) {
      dayDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setSelectedDate(date)
  }, [selectedDate])

  const filteredDays = useMemo(
    () =>
      calendarDays
        .filter(({ date }) => {
          const actionCount = actionCountsByDate[date] ?? 0
          const reminderCount = remindersByDate[date]?.length ?? 0
          const noteCount = notesByDate[date]?.length ?? 0
          return (
            (showActions && actionCount > 0) ||
            (showReminders && reminderCount > 0) ||
            (showNotes && noteCount > 0)
          )
        })
        .map(({ date }) => date),
    [actionCountsByDate, calendarDays, notesByDate, remindersByDate, showActions, showNotes, showReminders]
  )

  const openNoteDialog = useCallback(() => {
    if (!selectedDate) setSelectedDate(dateOnlyCDMX(getAppNow().toISOString()))
    setEditingNote(null)
    setNoteTitle('')
    setNoteText('')
    setNoteDialogOpen(true)
  }, [selectedDate])

  const openEditNoteDialog = useCallback((note: CalendarNote) => {
    setEditingNote(note)
    setNoteTitle(note.titulo)
    setNoteText(note.texto)
    setNoteDialogOpen(true)
  }, [])

  const noteSaving = createNote.isPending || updateNote.isPending

  const openReminderDialog = useCallback(() => {
    setReminderDeadline(defaultReminderDeadline())
    setReminderDialogOpen(true)
  }, [])

  return (
    <div id="calendar-view" className="calendar-view relative space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
      <div
        id="calendar-toolbar"
        className="calendar-toolbar flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border/60 bg-muted/10 p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:p-3"
      >
        <div
          className="calendar-toolbar-nav flex shrink-0 justify-center sm:justify-start"
          role="group"
          aria-label="Navegación del periodo"
        >
          <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm sm:h-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              aria-label="4 semanas anteriores"
              className="h-full w-8 shrink-0 rounded-none border-r border-border/50 px-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="calendar-toolbar-period flex min-w-[6.75rem] flex-col items-center justify-center bg-muted/20 px-3 sm:min-w-[8.5rem] sm:px-3.5">
              <time
                dateTime={calendarPeriod.dateTime}
                className="flex flex-col items-center leading-none"
              >
                <span className="truncate text-[12px] font-semibold capitalize tracking-tight text-foreground sm:text-sm">
                  {calendarPeriod.primary}
                </span>
                <span className="mt-1 text-[10px] font-semibold tabular-nums tracking-wide text-muted-foreground sm:text-[11px]">
                  {calendarPeriod.secondary}
                </span>
              </time>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              aria-label="4 semanas siguientes"
              className="h-full w-8 shrink-0 rounded-none border-l border-border/50 px-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'calendar-toolbar-actions grid min-w-0 gap-1.5 sm:min-w-0 sm:flex-1 lg:flex lg:flex-none lg:items-center lg:gap-2',
            onToggleFilters ? 'grid-cols-3' : 'grid-cols-2'
          )}
        >
            {showNotes || showReminders ? (
              <CalendarCreateDropdown
                onCreateNote={openNoteDialog}
                onCreateReminder={openReminderDialog}
                showNotes={showNotes}
                showReminders={showReminders}
                className="h-8 min-w-0 gap-1 border-border/60 bg-background/80 px-1.5 text-[11px] sm:h-9 sm:px-2.5 sm:text-xs lg:px-3 lg:text-sm"
              />
            ) : null}
            <Button
            variant="default"
            size="sm"
            onClick={goToday}
            className="h-8 min-w-0 gap-1 px-1.5 text-[11px] shadow-sm sm:h-9 sm:px-2.5 sm:text-xs lg:px-3 lg:text-sm"
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Hoy</span>
          </Button>
          {onToggleFilters ? (
            <Button
              id="calendar-btn-filters"
              type="button"
              variant={filtersExpanded ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggleFilters}
              aria-expanded={filtersExpanded}
              className={cn(
                'calendar-btn-filters relative h-8 min-w-0 gap-1 border-border/60 bg-background/80 px-1.5 text-[11px] sm:h-9 sm:px-2.5 sm:text-xs lg:px-3 lg:text-sm',
                filtersExpanded && 'border-primary/40 bg-primary/5 text-primary',
                hasActiveFilters && !filtersExpanded && 'border-primary/30 text-primary'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Filtros</span>
              {hasActiveFilters ? (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary lg:right-1.5 lg:top-1.5"
                  aria-label="Filtros activos"
                />
              ) : null}
            </Button>
          ) : null}
        </div>
      </div>

      {filtersExpanded && filterBar ? filterBar : null}

      {hasTypeFilter ? (
        <div id="calendar-filtered-days" className="rounded-lg border border-border/60 bg-card p-2.5 sm:rounded-xl sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground sm:text-sm">
              Días con {calendarFilterLabel(filters.itemType)}
            </p>
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground sm:text-xs">
              {filteredDays.length}
            </span>
          </div>
          {filteredDays.length > 0 ? (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
              {filteredDays.map((date) => (
                <Button
                  key={date}
                  type="button"
                  variant={date === selectedDate ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 shrink-0 px-2.5 text-xs"
                  onClick={() => selectDateAndScroll(date)}
                >
                  {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Sin {calendarFilterLabel(filters.itemType)} en este periodo.
            </p>
          )}
        </div>
      ) : null}

      <div id="calendar-grid" className="calendar-grid overflow-hidden rounded-lg border border-border/60 bg-card sm:rounded-xl">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center text-[10px] font-medium text-muted-foreground sm:text-xs">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className="py-1.5 sm:py-2">
              <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, day }) => {
            const count = actionCountsByDate[date] ?? 0
            const noteCount = (notesByDate[date] ?? []).length
            const reminderCount = (remindersByDate[date] ?? []).length
            const hasVisibleItems =
              (showActions && count > 0) ||
              (showReminders && reminderCount > 0) ||
              (showNotes && noteCount > 0)
            const isToday = date === todayStr
            const isSelected = date === selectedDate
            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDateAndScroll(date)}
                className={cn(
                  'min-h-[3.25rem] border-b border-r border-border/50 p-1 text-left transition-colors touch-manipulation sm:min-h-[5.5rem] sm:p-1.5 md:min-h-[88px] md:p-2',
                  'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                  isToday && 'bg-primary/5 ring-1 ring-primary/40 ring-inset sm:ring-2',
                  isSelected && 'bg-primary/10 ring-1 ring-primary ring-inset sm:ring-2',
                  hasTypeFilter && !hasVisibleItems && 'opacity-35'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-foreground sm:h-7 sm:w-7 sm:text-sm',
                    isToday && 'bg-primary text-primary-foreground'
                  )}
                >
                  {day}
                </span>
                <div className="mt-0.5 flex flex-wrap items-center gap-0.5 sm:mt-1 sm:gap-1">
                  {showActions && count > 0 ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary sm:hidden"
                      title={`${count} acción(es)`}
                    />
                  ) : null}
                  {showReminders && reminderCount > 0 ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-amber-500 sm:hidden"
                      title={`${reminderCount} recordatorio(s)`}
                    />
                  ) : null}
                  {showNotes && noteCount > 0 ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500 sm:hidden"
                      title={`${noteCount} minuta(s)`}
                    />
                  ) : null}
                </div>
                <div className="mt-0.5 hidden flex-col gap-0.5 sm:flex">
                  {showActions && count > 0 ? (
                    <span className="w-fit rounded bg-primary/15 px-1 py-px text-[10px] font-medium text-primary">
                      {count} acc.
                    </span>
                  ) : null}
                  {showReminders && reminderCount > 0 ? (
                    <span className="w-fit rounded bg-amber-500/15 px-1 py-px text-[10px] font-medium text-amber-800 dark:text-amber-200">
                      {reminderCount} rec.
                    </span>
                  ) : null}
                  {showNotes && noteCount > 0 ? (
                    <span className="w-fit rounded bg-emerald-500/15 px-1 py-px text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
                      {noteCount} min.
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate ? (
        <div
          ref={dayDetailRef}
          id="calendar-day-detail"
          className="calendar-day-detail scroll-mt-4 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:scroll-mt-6 sm:rounded-2xl sm:p-5"
        >
          <div className="mb-3 flex flex-col gap-2 border-b border-border/40 pb-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Día seleccionado
              </p>
              <h4 className="mt-0.5 truncate text-sm font-semibold capitalize text-foreground sm:text-base">
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h4>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {showNotes || showReminders ? (
                <CalendarCreateDropdown
                  onCreateNote={openNoteDialog}
                  onCreateReminder={openReminderDialog}
                  showNotes={showNotes}
                  showReminders={showReminders}
                  className="h-9 w-full text-xs sm:w-auto sm:text-sm"
                />
              ) : null}
              {showActions ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full shrink-0 text-xs sm:w-auto sm:text-sm"
                  onClick={() => navigate(`${ROUTES.KANBAN}?fecha=${selectedDate}`)}
                >
                  Kanban
                </Button>
              ) : null}
            </div>
          </div>

          {visibleDayTabs.length > 1 ? (
            <div
              className="mb-3 grid gap-1 rounded-xl border border-border/60 bg-muted/20 p-1 md:hidden"
              style={{ gridTemplateColumns: `repeat(${visibleDayTabs.length}, minmax(0, 1fr))` }}
              role="tablist"
              aria-label="Contenido del día"
            >
              {visibleDayTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mobileDayTab === tab}
                  className={cn(
                    'min-h-9 rounded-md px-1 text-[11px] font-medium capitalize transition-colors',
                    mobileDayTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => setMobileDayTab(tab)}
                >
                  {tab === 'recordatorios' ? 'Record.' : tab === 'minutas' ? 'Minutas' : 'Acciones'}
                </button>
              ))}
            </div>
          ) : null}

          <div className="md:hidden">
            {mobileDayTab === 'minutas' && showNotes ? (
              <CalendarNotesPanel
                date={selectedDate}
                notes={selectedNotes}
                isLoading={notesLoading}
                isError={notesError}
                onEdit={openEditNoteDialog}
                compact
              />
            ) : null}
            {mobileDayTab === 'recordatorios' && showReminders ? (
              <CalendarRemindersPanel
                reminders={selectedReminders}
                isLoading={remindersLoading}
                isError={remindersError}
                closingId={completeReminder.isPending ? completeReminder.variables ?? null : null}
                onComplete={(id) => completeReminder.mutate(id)}
                compact
              />
            ) : null}
            {mobileDayTab === 'acciones' && showActions ? (
              <CalendarActionsPanel
                acciones={selectedActions}
                responsableNames={responsableNames}
                onOpenAccion={(accion) => {
                  if (onSelectAccion) onSelectAccion(accion)
                  else navigate(`${ROUTES.KANBAN}?accion=${accion.id}`)
                }}
                compact
              />
            ) : null}
          </div>

          <div className="hidden space-y-3 md:block md:space-y-4">
            {showNotes ? (
              <CalendarNotesPanel
                date={selectedDate}
                notes={selectedNotes}
                isLoading={notesLoading}
                isError={notesError}
                onEdit={openEditNoteDialog}
              />
            ) : null}
            {showReminders ? (
              <CalendarRemindersPanel
                reminders={selectedReminders}
                isLoading={remindersLoading}
                isError={remindersError}
                closingId={completeReminder.isPending ? completeReminder.variables ?? null : null}
                onComplete={(id) => completeReminder.mutate(id)}
              />
            ) : null}
            {showActions ? (
              <CalendarActionsPanel
                acciones={selectedActions}
                responsableNames={responsableNames}
                onOpenAccion={(accion) => {
                  if (onSelectAccion) onSelectAccion(accion)
                  else navigate(`${ROUTES.KANBAN}?accion=${accion.id}`)
                }}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground sm:text-sm">
          Selecciona un día en el calendario para ver acciones, recordatorios o minutas.
        </p>
      )}

      {((showActions && (actionCountsLoading || isLoading || commentsLoading)) ||
        (showReminders && remindersLoading) ||
        (showNotes && notesLoading)) ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}

      <QuickNoteDialog
        open={noteDialogOpen}
        mode={editingNote ? 'edit' : 'create'}
        date={editingNote?.fecha ?? selectedDate}
        title={noteTitle}
        text={noteText}
        disabled={!currentUser?.id || noteSaving}
        isSaving={noteSaving}
        onOpenChange={handleNoteDialogOpenChange}
        onTitleChange={setNoteTitle}
        onTextChange={setNoteText}
        onSubmit={() => {
          if (!currentUser?.id) return
          if (!noteTitle.trim() || !noteText.trim()) return
          if (editingNote) {
            updateNote.mutate({
              id: editingNote.id,
              titulo: noteTitle,
              texto: noteText,
            })
            return
          }
          const targetDate = selectedDate ?? dateOnlyCDMX(getAppNow().toISOString())
          const dateError = validateTodayOrFutureDateCDMX(targetDate, 'La fecha del elemento')
          if (dateError) {
            toast.error(dateError)
            return
          }
          createNote.mutate({
            user_id: currentUser.id,
            fecha: targetDate,
            titulo: noteTitle,
            texto: noteText,
          })
        }}
      />

      <QuickReminderDialog
        open={reminderDialogOpen}
        title={reminderTitle}
        deadline={reminderDeadline}
        description={reminderDescription}
        disabled={!currentUser?.id || createReminder.isPending}
        isSaving={createReminder.isPending}
        onOpenChange={setReminderDialogOpen}
        onTitleChange={setReminderTitle}
        onDeadlineChange={setReminderDeadline}
        onDescriptionChange={setReminderDescription}
        onSubmit={() => {
          if (!currentUser?.id) return
          if (!reminderTitle.trim() || !reminderDeadline || !reminderDescription.trim()) return
          const futureError = validateFutureDatetimeLocalWallClock(
            reminderDeadline,
            'La fecha y hora del recordatorio'
          )
          if (futureError) {
            toast.error(futureError)
            return
          }
          createReminder.mutate({
            user_id: currentUser.id,
            titulo: reminderTitle,
            descripcion: reminderDescription,
            fecha_limite: new Date(reminderDeadline).toISOString(),
          })
        }}
      />
    </div>
  )
}

const CALENDAR_DAY_LIST_CLASS =
  'max-h-[min(18rem,50vh)] space-y-1 overflow-y-auto overscroll-y-contain pr-0.5'

const CALENDAR_DAY_ITEM_CLASS =
  'flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1.5 shadow-sm'

const CALENDAR_DAY_ACTION_ITEM_CLASS =
  'flex flex-col gap-1 rounded-md border border-border/60 bg-background px-2 py-1.5 shadow-sm'

const CALENDAR_DAY_ACTION_BTN_CLASS = 'h-7 shrink-0 gap-1 px-1.5 text-[10px]'

function CalendarDayItemActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>{children}</div>
  )
}

function CalendarDayEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/50 bg-muted/15 px-3 py-5 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function CalendarPanelShell({
  title,
  icon,
  count,
  children,
  compact,
  action,
}: {
  title: string
  icon: ReactNode
  count?: number
  children: ReactNode
  compact?: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-muted/10 shadow-sm',
        compact ? 'p-2.5' : 'p-3 sm:p-4'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/60">
              {icon}
            </span>
          ) : null}
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {count != null ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function CalendarNotesPanel({
  notes,
  isLoading,
  isError,
  onEdit,
  compact,
}: {
  date: string
  notes: CalendarNote[]
  isLoading: boolean
  isError: boolean
  onEdit?: (note: CalendarNote) => void
  compact?: boolean
}) {
  return (
    <CalendarPanelShell
      title="Minutas"
      icon={<StickyNote className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
      count={notes.length}
      compact={compact}
    >
      {isError ? (
        <p className="text-xs text-destructive">No se pudieron cargar.</p>
      ) : isLoading ? (
        <CalendarListSkeleton />
      ) : notes.length === 0 ? (
        <CalendarDayEmptyState message="Sin minutas este día." />
      ) : (
        <ul className={CALENDAR_DAY_LIST_CLASS}>
          {notes.map((note) => (
            <li
              key={note.id}
              className={cn(CALENDAR_DAY_ITEM_CLASS, 'border-l-2 border-l-emerald-500/40')}
            >
              <div className="min-w-0 flex-1 truncate">
                <span className="text-sm font-medium text-foreground">{note.titulo}</span>
                {note.texto?.trim() ? (
                  <span className="text-[10px] text-muted-foreground"> · {note.texto.trim()}</span>
                ) : null}
              </div>
              {onEdit ? (
                <CalendarDayItemActions>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={CALENDAR_DAY_ACTION_BTN_CLASS}
                    aria-label={`Editar minuta ${note.titulo}`}
                    onClick={() => onEdit(note)}
                  >
                    <Pencil className="h-3 w-3" aria-hidden />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </CalendarDayItemActions>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </CalendarPanelShell>
  )
}

function CalendarListSkeleton() {
  return (
    <ul className="space-y-1" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <li key={i} className="h-9 animate-pulse rounded-md border border-border/40 bg-muted/30" />
      ))}
    </ul>
  )
}

function CalendarRemindersPanel({
  reminders,
  isLoading,
  isError,
  closingId,
  onComplete,
  compact,
}: {
  reminders: CalendarReminder[]
  isLoading: boolean
  isError: boolean
  closingId: string | null
  onComplete: (id: string) => void
  compact?: boolean
}) {
  return (
    <CalendarPanelShell
      title="Recordatorios"
      icon={<AlarmClock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />}
      count={reminders.length}
      compact={compact}
    >
      {isError ? (
        <p className="text-xs text-destructive">No se pudieron cargar.</p>
      ) : isLoading ? (
        <CalendarListSkeleton />
      ) : reminders.length === 0 ? (
        <CalendarDayEmptyState message="Sin recordatorios este día." />
      ) : (
        <ul className={CALENDAR_DAY_LIST_CLASS}>
          {reminders.map((reminder) => {
            const isCompleted = Boolean(reminder.completed_at)
            const isClosing = closingId === reminder.id

            return (
              <li
                key={reminder.id}
                className={cn(
                  CALENDAR_DAY_ITEM_CLASS,
                  'border-l-2',
                  isCompleted
                    ? 'border-l-emerald-500/50 bg-emerald-500/[0.04]'
                    : 'border-l-amber-500/50'
                )}
              >
                <div className="min-w-0 flex-1 truncate">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}
                  >
                    {reminder.titulo}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {' · '}
                    {isCompleted
                      ? formatReminderDateTime(reminder.completed_at!)
                      : formatReminderDateTime(reminder.fecha_limite)}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'hidden h-5 shrink-0 px-1.5 text-[9px] font-medium sm:inline-flex',
                    isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  )}
                >
                  {isCompleted ? 'Cerrado' : 'Pendiente'}
                </Badge>
                <CalendarDayItemActions>
                  <Button
                    type="button"
                    variant={isCompleted ? 'ghost' : 'outline'}
                    size="sm"
                    className={CALENDAR_DAY_ACTION_BTN_CLASS}
                    disabled={isCompleted || isClosing}
                    onClick={() => onComplete(reminder.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">
                      {isCompleted ? 'Cerrado' : isClosing ? 'Cerrando…' : 'Cerrar'}
                    </span>
                  </Button>
                </CalendarDayItemActions>
              </li>
            )
          })}
        </ul>
      )}
    </CalendarPanelShell>
  )
}

function CalendarActionsPanel({
  acciones,
  responsableNames,
  onOpenAccion,
  compact,
}: {
  acciones: AccionDiaria[]
  responsableNames: Record<string, string>
  onOpenAccion: (accion: AccionDiaria) => void
  compact?: boolean
}) {
  return (
    <CalendarPanelShell
      title="Acciones"
      count={acciones.length}
      compact={compact}
      icon={<ClipboardList className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
    >
      {acciones.length === 0 ? (
        <CalendarDayEmptyState message="Sin acciones visibles este día." />
      ) : (
        <ul className={CALENDAR_DAY_LIST_CLASS}>
          {acciones.map((accion) => (
            <li
              key={accion.id}
              className={cn(CALENDAR_DAY_ACTION_ITEM_CLASS, 'border-l-2 border-l-primary/35')}
            >
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-1 text-left transition-colors hover:text-foreground active:text-foreground"
                onClick={() => onOpenAccion(accion)}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {accion.titulo_accion?.trim() || accion.descripcion_accion}
                </span>
                <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} className="shrink-0" />
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </button>
              <div className="flex items-center justify-between gap-1">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                  <span className="shrink-0">{accion.hora_limite?.slice(0, 5) ?? '—'}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="truncate">{responsableNames[accion.responsable] ?? 'Sin responsable'}</span>
                  <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px] font-medium">
                    {accion.estado}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CalendarPanelShell>
  )
}

function CalendarCreateDropdown({
  onCreateNote,
  onCreateReminder,
  showNotes = true,
  showReminders = true,
  className,
}: {
  onCreateNote: () => void
  onCreateReminder: () => void
  showNotes?: boolean
  showReminders?: boolean
  className?: string
}) {
  if (!showNotes && !showReminders) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-1.5 border-border/60 bg-background/80', className)}
        >
          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">Crear</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {showNotes ? (
          <DropdownMenuItem className="gap-2" onClick={onCreateNote}>
            <StickyNote className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Minuta
          </DropdownMenuItem>
        ) : null}
        {showReminders ? (
          <DropdownMenuItem className="gap-2" onClick={onCreateReminder}>
            <AlarmClock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            Recordatorio
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function QuickNoteDialog({
  open,
  mode,
  date,
  title,
  text,
  disabled,
  isSaving,
  onOpenChange,
  onTitleChange,
  onTextChange,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  date: string | null
  title: string
  text: string
  disabled: boolean
  isSaving: boolean
  onOpenChange: (value: boolean) => void
  onTitleChange: (value: string) => void
  onTextChange: (value: string) => void
  onSubmit: () => void
}) {
  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] w-[calc(100vw-1rem)] max-w-lg sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar minuta' : 'Crear minuta'}</DialogTitle>
          <DialogDescription>
            {date
              ? isEdit
                ? `Minuta del ${date}.`
                : `Se guardara en ${date}.`
              : isEdit
                ? 'Edita el titulo y las notas de esta minuta.'
                : 'Se guardara en el dia actual.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="quick-note-title">Titulo</Label>
            <Input
              id="quick-note-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Ej. Seguimiento con operaciones"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-note-text">Notas</Label>
            <textarea
              id="quick-note-text"
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="Acuerdos, pendientes o contexto..."
              className="min-h-[12rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
            />
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="outline" className="h-10 w-full sm:h-9 sm:w-auto" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancelar
          </Button>
          <Button type="button" className="h-10 w-full sm:h-9 sm:w-auto" onClick={onSubmit} disabled={disabled || !title.trim() || !text.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            {isSaving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear minuta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QuickReminderDialog({
  open,
  title,
  deadline,
  description,
  disabled,
  isSaving,
  onOpenChange,
  onTitleChange,
  onDeadlineChange,
  onDescriptionChange,
  onSubmit,
}: {
  open: boolean
  title: string
  deadline: string
  description: string
  disabled: boolean
  isSaving: boolean
  onOpenChange: (value: boolean) => void
  onTitleChange: (value: string) => void
  onDeadlineChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] w-[calc(100vw-1rem)] max-w-lg sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Crear recordatorio</DialogTitle>
          <DialogDescription>Al llegar la fecha límite se generará una notificación.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="quick-reminder-title">Titulo</Label>
            <Input
              id="quick-reminder-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Ej. Enviar minuta al equipo"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-reminder-deadline">Fecha limite</Label>
            <Input
              id="quick-reminder-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(event) => onDeadlineChange(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-reminder-description">Descripcion</Label>
            <textarea
              id="quick-reminder-description"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Detalle del recordatorio..."
              className="min-h-[9rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
            />
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="outline" className="h-10 w-full sm:h-9 sm:w-auto" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancelar
          </Button>
          <Button type="button" className="h-10 w-full sm:h-9 sm:w-auto" onClick={onSubmit} disabled={disabled || !title.trim() || !deadline || !description.trim()}>
            <AlarmClock className="h-4 w-4" aria-hidden />
            {isSaving ? 'Guardando…' : 'Crear recordatorio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
