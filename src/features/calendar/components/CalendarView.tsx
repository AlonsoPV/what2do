import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlarmClock,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Mail,
  Plus,
  Send,
  SlidersHorizontal,
  StickyNote,
  Pencil,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { dateOnlyCDMX, monthName } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import { accionComentariosService } from '@/services/accionComentarios.service'
import { accionesService } from '@/services/acciones.service'
import { calendarNotesService, type CalendarNote } from '@/services/calendarNotes.service'
import { calendarRemindersService, type CalendarReminder } from '@/services/calendarReminders.service'
import {
  googleWorkspaceService,
  type GoogleWorkspaceSyncInput,
  type GoogleWorkspaceTarget,
} from '@/services/googleWorkspace.service'
import type { AccionComentarioVisibility } from '@/services/accionComentarios.service'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

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

function currentYearMonth(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function yearMonthFromDate(date: string): { year: number; month: number } {
  const [year, month] = date.split('-').map(Number)
  if (!year || !month) return currentYearMonth()
  return { year, month }
}

function weekdayMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7
}

function getCalendarDays(year: number, month: number): { date: string; isCurrentMonth: boolean; day: number }[] {
  const first = new Date(year, month - 1, 1)
  const startPad = weekdayMondayFirst(first)
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalCells = 42
  const result: { date: string; isCurrentMonth: boolean; day: number }[] = []

  if (startPad > 0) {
    const prevDate = new Date(year, month - 2, 1)
    const prevYear = prevDate.getFullYear()
    const prevMonth = prevDate.getMonth() + 1
    const prevLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = 0; i < startPad; i += 1) {
      const day = prevLastDay - startPad + 1 + i
      result.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        day,
      })
    }
  }

  for (let i = 1; i <= daysInMonth; i += 1) {
    result.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: true,
      day: i,
    })
  }

  const nextDate = new Date(year, month, 1)
  const nextYear = nextDate.getFullYear()
  const nextMonth = nextDate.getMonth() + 1
  const remaining = totalCells - result.length
  for (let i = 1; i <= remaining; i += 1) {
    result.push({
      date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      isCurrentMonth: false,
      day: i,
    })
  }

  return result.slice(0, totalCells)
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

function datetimeLocalForDate(date: string | null): string {
  const base = date ?? dateOnlyCDMX(new Date().toISOString())
  return `${base}T09:00`
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
  const [view, setView] = useState(() =>
    initialSelectedDate ? yearMonthFromDate(initialSelectedDate) : currentYearMonth()
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDeadline, setReminderDeadline] = useState(datetimeLocalForDate(null))
  const [reminderDescription, setReminderDescription] = useState('')
  const [mobileDayTab, setMobileDayTab] = useState<CalendarDayTab>('acciones')
  const dayDetailRef = useRef<HTMLDivElement | null>(null)
  const shouldScrollToDetailRef = useRef(false)

  const calendarDays = useMemo(() => getCalendarDays(view.year, view.month), [view.year, view.month])
  const gridFirstDate = calendarDays[0]?.date ?? ''
  const gridLastDate = calendarDays[calendarDays.length - 1]?.date ?? ''

  useEffect(() => {
    if (!initialSelectedDate) return
    setSelectedDate(initialSelectedDate)
    setView(yearMonthFromDate(initialSelectedDate))
  }, [initialSelectedDate])

  const accionesFilter = useMemo<AccionesFilter>(
    () => ({
      calendario_creadas_hasta: selectedDate || undefined,
      excluir_estados: filters.estado ? undefined : ['Verificado'],
      area: filters.area,
      responsable: filters.responsable,
      estado: filters.estado,
    }),
    [filters.area, filters.estado, filters.responsable, selectedDate]
  )

  const { data: actionCountsByDate = {}, isLoading: actionCountsLoading } = useQuery({
    queryKey: [
      'calendar-action-counts',
      currentUser?.id ?? '',
      gridFirstDate,
      gridLastDate,
      filters.area ?? '',
      filters.responsable ?? '',
      filters.estado ?? '',
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
    enabled: Boolean(currentUser?.id && gridFirstDate && gridLastDate),
    staleTime: 2 * 60_000,
  })

  const { data: acciones = [], isLoading } = useAcciones(accionesFilter, {
    enabled: Boolean(currentUser?.id && selectedDate),
  })

  const actionIds = useMemo(() => acciones.map((accion) => accion.id), [acciones])
  const {
    data: calendarComments = [],
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ['calendar-action-comments', currentUser?.id ?? '', actionIds],
    queryFn: () => accionComentariosService.listVisibilityByAccionIds(actionIds),
    enabled: Boolean(currentUser?.id && actionIds.length > 0),
    staleTime: 2 * 60_000,
  })

  const visibleAcciones = useMemo(
    () => filterAccionesByCalendarVisibility(acciones, calendarComments, currentUser?.id),
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
      setReminderDeadline(datetimeLocalForDate(selectedDate))
      setReminderDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      toast.success('Recordatorio creado')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo crear el recordatorio'),
  })

  const syncGoogle = useMutation({
    mutationFn: googleWorkspaceService.sync,
    onSuccess: (result) => {
      const label =
        result.target === 'task'
          ? 'Tarea creada en Google Tasks'
          : result.target === 'gmail'
            ? 'Correo enviado con Gmail'
            : result.target === 'calendar_meet'
              ? 'Evento con Google Meet creado'
              : 'Evento creado en Google Calendar'
      toast.success(label)
      const url = result.meetUrl || result.url
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo sincronizar con Google'),
  })

  const completeReminder = useMutation({
    mutationFn: (id: string) => calendarRemindersService.complete(id, currentUser!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders-due'] })
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
    setView((current) => current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: current.month - 1 })
  }, [])

  const goNext = useCallback(() => {
    setView((current) => current.month === 12 ? { year: current.year + 1, month: 1 } : { year: current.year, month: current.month + 1 })
  }, [])

  const goToday = useCallback(() => {
    setView(currentYearMonth())
    setSelectedDate(null)
  }, [])

  const todayStr = useMemo(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }, [])

  const selectedActions = selectedDate ? visibleAcciones : []
  const selectedNotes = selectedDate ? (notesByDate[selectedDate] ?? []) : []
  const selectedReminders = selectedDate ? (remindersByDate[selectedDate] ?? []) : []
  const showActions = shouldShowCalendarItem(filters.itemType, 'acciones')
  const showReminders = shouldShowCalendarItem(filters.itemType, 'recordatorios')
  const showNotes = shouldShowCalendarItem(filters.itemType, 'minutas')
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
    if (!selectedDate) setSelectedDate(dateOnlyCDMX(new Date().toISOString()))
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
    const nextDate = selectedDate ?? dateOnlyCDMX(new Date().toISOString())
    if (!selectedDate) setSelectedDate(nextDate)
    setReminderDeadline(datetimeLocalForDate(nextDate))
    setReminderDialogOpen(true)
  }, [selectedDate])

  const handleGoogleSync = useCallback(
    (input: GoogleWorkspaceSyncInput) => {
      syncGoogle.mutate(input)
    },
    [syncGoogle]
  )

  return (
    <div id="calendar-view" className="calendar-view relative space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
      <div
        id="calendar-toolbar"
        className="calendar-toolbar flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border/60 bg-muted/10 p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:p-3"
      >
        <div
          className="calendar-toolbar-nav flex shrink-0 justify-center sm:justify-start"
          role="group"
          aria-label="Navegación del mes"
        >
          <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm sm:h-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              aria-label="Mes anterior"
              className="h-full w-8 shrink-0 rounded-none border-r border-border/50 px-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="calendar-toolbar-period flex min-w-[6.75rem] flex-col items-center justify-center bg-muted/20 px-3 sm:min-w-[7.75rem] sm:px-3.5">
              <time
                dateTime={`${view.year}-${String(view.month).padStart(2, '0')}`}
                className="flex flex-col items-center leading-none"
              >
                <span className="truncate text-[13px] font-semibold capitalize tracking-tight text-foreground sm:text-sm">
                  {monthName(view.year, view.month)}
                </span>
                <span className="mt-1 text-[10px] font-semibold tabular-nums tracking-wide text-muted-foreground sm:text-[11px]">
                  {view.year}
                </span>
              </time>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              aria-label="Mes siguiente"
              className="h-full w-8 shrink-0 rounded-none border-l border-border/50 px-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="calendar-toolbar-actions grid min-w-0 grid-cols-4 gap-1.5 sm:min-w-0 sm:flex-1 lg:flex lg:flex-none lg:items-center lg:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openNoteDialog}
            className="h-8 min-w-0 gap-1 border-border/60 bg-background/80 px-1.5 text-[11px] sm:h-9 sm:px-2.5 sm:text-xs lg:px-3 lg:text-sm"
          >
            <StickyNote className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Minuta</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openReminderDialog}
            className="h-8 min-w-0 gap-1 border-border/60 bg-background/80 px-1.5 text-[11px] sm:h-9 sm:px-2.5 sm:text-xs lg:px-3 lg:text-sm"
          >
            <AlarmClock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate xl:hidden">Record.</span>
            <span className="hidden truncate xl:inline">Recordatorio</span>
          </Button>
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
              Sin {calendarFilterLabel(filters.itemType)} este mes.
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
          {calendarDays.map(({ date, isCurrentMonth, day }) => {
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
                  !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                  isToday && 'bg-primary/5 ring-1 ring-primary/40 ring-inset sm:ring-2',
                  isSelected && 'bg-primary/10 ring-1 ring-primary ring-inset sm:ring-2',
                  hasTypeFilter && !hasVisibleItems && 'opacity-35'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-7 sm:w-7 sm:text-sm',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && isCurrentMonth && 'text-foreground',
                    !isCurrentMonth && 'text-muted-foreground'
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
          className="calendar-day-detail scroll-mt-4 rounded-lg border border-border/60 bg-card p-3 sm:scroll-mt-6 sm:rounded-xl sm:p-4"
        >
          <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
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

          {visibleDayTabs.length > 1 ? (
            <div
              className="mb-3 grid gap-1 rounded-lg border border-border/60 bg-muted/25 p-1 md:hidden"
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
                onCreate={openNoteDialog}
                onGoogleSync={(note, target) =>
                  handleGoogleSync({
                    source: 'minuta',
                    target,
                    title: note.titulo,
                    description: note.texto,
                    date: note.fecha,
                  })
                }
                googleSyncDisabled={syncGoogle.isPending}
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
                onCreate={openReminderDialog}
                onGoogleSync={(reminder, target) =>
                  handleGoogleSync({
                    source: 'recordatorio',
                    target,
                    title: reminder.titulo,
                    description: reminder.descripcion,
                    dueAt: reminder.fecha_limite,
                  })
                }
                googleSyncDisabled={syncGoogle.isPending}
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
                onGoogleSync={(accion, target) =>
                  handleGoogleSync({
                    source: 'accion',
                    target,
                    title: accion.titulo_accion?.trim() || accion.descripcion_accion,
                    description: accion.descripcion_accion,
                    date: accion.fecha,
                    dueAt: `${accion.fecha}T${accion.hora_limite?.slice(0, 5) || '09:00'}:00-06:00`,
                    actionId: accion.id,
                    responsibleUserId: accion.responsable,
                  })
                }
                googleSyncDisabled={syncGoogle.isPending}
                compact
              />
            ) : null}
          </div>

          <div className="hidden space-y-4 md:block">
            {showNotes ? (
              <CalendarNotesPanel
                date={selectedDate}
                notes={selectedNotes}
                isLoading={notesLoading}
                isError={notesError}
                onEdit={openEditNoteDialog}
                onCreate={openNoteDialog}
                onGoogleSync={(note, target) =>
                  handleGoogleSync({
                    source: 'minuta',
                    target,
                    title: note.titulo,
                    description: note.texto,
                    date: note.fecha,
                  })
                }
                googleSyncDisabled={syncGoogle.isPending}
              />
            ) : null}
            {showReminders ? (
              <CalendarRemindersPanel
                reminders={selectedReminders}
                isLoading={remindersLoading}
                isError={remindersError}
                closingId={completeReminder.isPending ? completeReminder.variables ?? null : null}
                onComplete={(id) => completeReminder.mutate(id)}
                onCreate={openReminderDialog}
                onGoogleSync={(reminder, target) =>
                  handleGoogleSync({
                    source: 'recordatorio',
                    target,
                    title: reminder.titulo,
                    description: reminder.descripcion,
                    dueAt: reminder.fecha_limite,
                  })
                }
                googleSyncDisabled={syncGoogle.isPending}
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
                onGoogleSync={(accion, target) =>
                  handleGoogleSync({
                    source: 'accion',
                    target,
                    title: accion.titulo_accion?.trim() || accion.descripcion_accion,
                    description: accion.descripcion_accion,
                    date: accion.fecha,
                    dueAt: `${accion.fecha}T${accion.hora_limite?.slice(0, 5) || '09:00'}:00-06:00`,
                    actionId: accion.id,
                    responsibleUserId: accion.responsable,
                  })
                }
                googleSyncDisabled={syncGoogle.isPending}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground sm:text-sm">
          Selecciona un día en el calendario para ver acciones, recordatorios o minutas.
        </p>
      )}

      {actionCountsLoading || isLoading || commentsLoading ? (
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
          const targetDate = selectedDate ?? dateOnlyCDMX(new Date().toISOString())
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
        'rounded-lg border border-border/60 bg-muted/10',
        compact ? 'p-2.5' : 'p-3 sm:p-4'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {icon ?? null}
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {count != null ? (
            <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-muted-foreground">
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
  onCreate,
  onGoogleSync,
  googleSyncDisabled,
  compact,
}: {
  date: string
  notes: CalendarNote[]
  isLoading: boolean
  isError: boolean
  onEdit?: (note: CalendarNote) => void
  onCreate?: () => void
  onGoogleSync?: (note: CalendarNote, target: Extract<GoogleWorkspaceTarget, 'calendar_meet' | 'gmail'>) => void
  googleSyncDisabled?: boolean
  compact?: boolean
}) {
  return (
    <CalendarPanelShell
      title="Minutas"
      icon={<StickyNote className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
      count={notes.length}
      compact={compact}
      action={
        onCreate ? (
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Crear</span>
          </Button>
        ) : null
      }
    >
      {isError ? (
        <p className="text-xs text-destructive">No se pudieron cargar.</p>
      ) : isLoading ? (
        <CalendarListSkeleton />
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin minutas este día.</p>
      ) : (
        <ul className="max-h-[min(16rem,45vh)] space-y-1.5 overflow-y-auto overscroll-y-contain">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-border/60 bg-background px-2.5 py-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{note.titulo}</p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {note.texto}
                  </p>
                </div>
                {onEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Editar minuta ${note.titulo}`}
                    onClick={() => onEdit(note)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              {onGoogleSync ? (
                <GoogleSyncButtons
                  className="mt-2"
                  targets={['calendar_meet', 'gmail']}
                  disabled={googleSyncDisabled}
                  onSync={(target) =>
                    onGoogleSync(note, target as Extract<GoogleWorkspaceTarget, 'calendar_meet' | 'gmail'>)
                  }
                />
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
    <ul className="space-y-1.5" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <li key={i} className="h-11 animate-pulse rounded-md border border-border/40 bg-muted/30" />
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
  onCreate,
  onGoogleSync,
  googleSyncDisabled,
  compact,
}: {
  reminders: CalendarReminder[]
  isLoading: boolean
  isError: boolean
  closingId: string | null
  onComplete: (id: string) => void
  onCreate: () => void
  onGoogleSync?: (reminder: CalendarReminder, target: Extract<GoogleWorkspaceTarget, 'calendar' | 'task' | 'gmail'>) => void
  googleSyncDisabled?: boolean
  compact?: boolean
}) {
  return (
    <CalendarPanelShell
      title="Recordatorios"
      icon={<AlarmClock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />}
      count={reminders.length}
      compact={compact}
      action={
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Crear</span>
        </Button>
      }
    >
      {isError ? (
        <p className="text-xs text-destructive">No se pudieron cargar.</p>
      ) : isLoading ? (
        <CalendarListSkeleton />
      ) : reminders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin recordatorios este día.</p>
      ) : (
        <ul className="max-h-[min(16rem,45vh)] space-y-1.5 overflow-y-auto overscroll-y-contain">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className={cn(
                'rounded-md border px-2.5 py-2',
                reminder.completed_at
                  ? 'border-emerald-500/25 bg-emerald-500/5'
                  : 'border-border/60 bg-background'
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{reminder.titulo}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {reminder.completed_at
                      ? `Cerrado · ${formatReminderDateTime(reminder.completed_at)}`
                      : formatReminderDateTime(reminder.fecha_limite)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={reminder.completed_at ? 'ghost' : 'outline'}
                  size="sm"
                  className="h-8 w-full text-xs sm:w-auto"
                  disabled={Boolean(reminder.completed_at) || closingId === reminder.id}
                  onClick={() => onComplete(reminder.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {reminder.completed_at ? 'Cerrado' : closingId === reminder.id ? 'Cerrando…' : 'Cerrar'}
                </Button>
                {onGoogleSync ? (
                  <GoogleSyncButtons
                    targets={['task', 'calendar', 'gmail']}
                    disabled={googleSyncDisabled || Boolean(reminder.completed_at)}
                    onSync={(target) =>
                      onGoogleSync(reminder, target as Extract<GoogleWorkspaceTarget, 'calendar' | 'task' | 'gmail'>)
                    }
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CalendarPanelShell>
  )
}

function CalendarActionsPanel({
  acciones,
  responsableNames,
  onOpenAccion,
  onGoogleSync,
  googleSyncDisabled,
  compact,
}: {
  acciones: AccionDiaria[]
  responsableNames: Record<string, string>
  onOpenAccion: (accion: AccionDiaria) => void
  onGoogleSync?: (accion: AccionDiaria, target: Extract<GoogleWorkspaceTarget, 'calendar' | 'task' | 'gmail'>) => void
  googleSyncDisabled?: boolean
  compact?: boolean
}) {
  return (
    <CalendarPanelShell title="Acciones" count={acciones.length} compact={compact} icon={null}>
      {acciones.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin acciones visibles este día.</p>
      ) : (
        <ul className="max-h-[min(18rem,50vh)] space-y-1.5 overflow-y-auto overscroll-y-contain">
          {acciones.map((accion) => (
            <li key={accion.id}>
              <button
                type="button"
                className="flex w-full min-h-11 items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/30 active:bg-muted/40"
                onClick={() => onOpenAccion(accion)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="line-clamp-1 flex-1 text-sm font-medium text-foreground">
                      {accion.titulo_accion?.trim() || accion.descripcion_accion}
                    </p>
                    <EvidenciaCargadaIndicator cargada={accion.evidencia_cargada} className="shrink-0" />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {accion.hora_limite?.slice(0, 5) ?? '—'} ·{' '}
                    {responsableNames[accion.responsable] ?? '—'} · {accion.estado}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
              {onGoogleSync ? (
                <GoogleSyncButtons
                  className="mt-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-2"
                  targets={['task', 'calendar', 'gmail']}
                  disabled={googleSyncDisabled}
                  onSync={(target) =>
                    onGoogleSync(accion, target as Extract<GoogleWorkspaceTarget, 'calendar' | 'task' | 'gmail'>)
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </CalendarPanelShell>
  )
}

function GoogleSyncButtons({
  targets,
  disabled,
  onSync,
  className,
}: {
  targets: GoogleWorkspaceTarget[]
  disabled?: boolean
  onSync: (target: GoogleWorkspaceTarget) => void
  className?: string
}) {
  const meta: Record<GoogleWorkspaceTarget, { label: string; icon: ReactNode }> = {
    task: { label: 'Google Tasks', icon: <ListTodo className="h-3.5 w-3.5" aria-hidden /> },
    calendar: { label: 'Google Calendar', icon: <CalendarIcon className="h-3.5 w-3.5" aria-hidden /> },
    calendar_meet: { label: 'Google Meet', icon: <Video className="h-3.5 w-3.5" aria-hidden /> },
    gmail: { label: 'Gmail', icon: <Mail className="h-3.5 w-3.5" aria-hidden /> },
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {targets.map((target) => (
        <Button
          key={target}
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-[11px]"
          disabled={disabled}
          onClick={() => onSync(target)}
          title={meta[target].label}
        >
          {meta[target].icon}
          {target === 'calendar_meet'
            ? 'Meet'
            : target === 'calendar'
              ? 'Calendar'
              : target === 'task'
                ? 'Tasks'
                : 'Gmail'}
        </Button>
      ))}
    </div>
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
