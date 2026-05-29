import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlarmClock,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Send,
  StickyNote,
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
import { AccionIdDisplay, EvidenciaCargadaIndicator } from '@/features/operations'
import { useAcciones } from '@/features/operations/hooks/useAcciones'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { addCalendarDays, dateOnlyCDMX, monthName } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import { accionComentariosService } from '@/services/accionComentarios.service'
import { calendarNotesService, type CalendarNote } from '@/services/calendarNotes.service'
import { calendarRemindersService, type CalendarReminder } from '@/services/calendarReminders.service'
import type { AccionComentario } from '@/types/accionComentario'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

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
}

function currentYearMonth(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
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

function expandAccionesPorDiasVisibles(
  acciones: AccionDiaria[],
  gridFirstDate: string,
  gridLastDate: string
): Record<string, AccionDiaria[]> {
  const map: Record<string, AccionDiaria[]> = {}
  for (const action of acciones) {
    if (action.estado === 'Verificado') continue
    const created = dateOnlyCDMX(action.created_at)
    const from = created > gridFirstDate ? created : gridFirstDate
    if (from > gridLastDate) continue
    let day = from
    while (day <= gridLastDate) {
      if (!map[day]) map[day] = []
      map[day].push(action)
      day = addCalendarDays(day, 1)
    }
  }
  Object.keys(map).forEach((key) => {
    map[key].sort((a, b) => (a.hora_limite || '').localeCompare(b.hora_limite || ''))
  })
  return map
}

function isTaggedInComment(comment: AccionComentario, userId: string): boolean {
  return comment.asignado === userId || comment.etiquetas?.includes(userId)
}

function filterAccionesByCalendarVisibility(
  acciones: AccionDiaria[],
  comments: AccionComentario[],
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

export function CalendarView({ responsableNames = {}, onSelectAccion, filters = {} }: CalendarViewProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const [view, setView] = useState(currentYearMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDeadline, setReminderDeadline] = useState(datetimeLocalForDate(null))
  const [reminderDescription, setReminderDescription] = useState('')

  const calendarDays = useMemo(() => getCalendarDays(view.year, view.month), [view.year, view.month])
  const gridFirstDate = calendarDays[0]?.date ?? ''
  const gridLastDate = calendarDays[calendarDays.length - 1]?.date ?? ''

  const accionesFilter = useMemo<AccionesFilter>(
    () => ({
      calendario_creadas_hasta: gridLastDate || undefined,
      excluir_estados: filters.estado ? undefined : ['Verificado'],
      area: filters.area,
      responsable: filters.responsable,
      estado: filters.estado,
    }),
    [filters.area, filters.estado, filters.responsable, gridLastDate]
  )

  const { data: acciones = [], isLoading } = useAcciones(accionesFilter, {
    enabled: Boolean(currentUser?.id && gridLastDate),
  })

  const actionIds = useMemo(() => acciones.map((accion) => accion.id), [acciones])
  const {
    data: calendarComments = [],
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ['calendar-action-comments', currentUser?.id ?? '', actionIds],
    queryFn: () => accionComentariosService.listByAccionIds(actionIds),
    enabled: Boolean(currentUser?.id && actionIds.length > 0),
    staleTime: 30_000,
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

  const createNote = useMutation({
    mutationFn: calendarNotesService.create,
    onSuccess: () => {
      setNoteTitle('')
      setNoteText('')
      setNoteDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['calendar-notes'] })
      toast.success('Minuta creada')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo crear la minuta'),
  })

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

  const completeReminder = useMutation({
    mutationFn: (id: string) => calendarRemindersService.complete(id, currentUser!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders'] })
      void queryClient.invalidateQueries({ queryKey: ['calendar-reminders-due'] })
      toast.success('Recordatorio cerrado')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo cerrar el recordatorio'),
  })

  const actionsByDate = useMemo(() => {
    if (!gridFirstDate || !gridLastDate) return {}
    return expandAccionesPorDiasVisibles(visibleAcciones, gridFirstDate, gridLastDate)
  }, [visibleAcciones, gridFirstDate, gridLastDate])

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

  const selectedActions = selectedDate ? (actionsByDate[selectedDate] ?? []) : []
  const selectedNotes = selectedDate ? (notesByDate[selectedDate] ?? []) : []
  const selectedReminders = selectedDate ? (remindersByDate[selectedDate] ?? []) : []
  const showActions = shouldShowCalendarItem(filters.itemType, 'acciones')
  const showReminders = shouldShowCalendarItem(filters.itemType, 'recordatorios')
  const showNotes = shouldShowCalendarItem(filters.itemType, 'minutas')
  const hasTypeFilter = Boolean(filters.itemType && filters.itemType !== 'todos')
  const filteredDays = useMemo(
    () =>
      calendarDays
        .filter(({ date }) => {
          const actionCount = actionsByDate[date]?.length ?? 0
          const reminderCount = remindersByDate[date]?.length ?? 0
          const noteCount = notesByDate[date]?.length ?? 0
          return (
            (showActions && actionCount > 0) ||
            (showReminders && reminderCount > 0) ||
            (showNotes && noteCount > 0)
          )
        })
        .map(({ date }) => date),
    [actionsByDate, calendarDays, notesByDate, remindersByDate, showActions, showNotes, showReminders]
  )

  const openNoteDialog = useCallback(() => {
    if (!selectedDate) setSelectedDate(dateOnlyCDMX(new Date().toISOString()))
    setNoteDialogOpen(true)
  }, [selectedDate])

  const openReminderDialog = useCallback(() => {
    const nextDate = selectedDate ?? dateOnlyCDMX(new Date().toISOString())
    if (!selectedDate) setSelectedDate(nextDate)
    setReminderDeadline(datetimeLocalForDate(nextDate))
    setReminderDialogOpen(true)
  }, [selectedDate])

  return (
    <div className="relative space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mes anterior" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[11rem] rounded-md border border-border bg-background px-4 py-1.5 text-center">
            <h3 className="text-base font-semibold capitalize leading-tight text-foreground">
              {monthName(view.year, view.month)}
            </h3>
            <p className="text-xs text-muted-foreground">{view.year}</p>
          </div>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Mes siguiente" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
          <Button variant="outline" size="sm" onClick={openNoteDialog} className="w-full sm:w-auto">
            <StickyNote className="h-4 w-4" />
            Minuta
          </Button>
          <Button variant="outline" size="sm" onClick={openReminderDialog} className="w-full sm:w-auto">
            <AlarmClock className="h-4 w-4" />
            Recordatorio
          </Button>
          <Button variant="default" size="sm" onClick={goToday} className="w-full sm:w-auto">
            <CalendarIcon className="h-4 w-4" />
            Hoy
          </Button>
        </div>
      </div>

      {hasTypeFilter ? (
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Dias con {calendarFilterLabel(filters.itemType)}
              </p>
              <p className="text-xs text-muted-foreground">Ordenados por dia dentro de la vista mensual.</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{filteredDays.length} dia(s)</span>
          </div>
          {filteredDays.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredDays.map((date) => (
                <Button
                  key={date}
                  type="button"
                  variant={date === selectedDate ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                  onClick={() => setSelectedDate(date)}
                >
                  {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No hay {calendarFilterLabel(filters.itemType)} en este mes.
            </p>
          )}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
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
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'min-h-[88px] border-b border-r border-border/50 p-2 text-left transition-colors',
                  'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                  !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                  isToday && 'bg-primary/5 ring-2 ring-primary/40 ring-inset',
                  isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset',
                  hasTypeFilter && !hasVisibleItems && 'opacity-35'
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
                {showActions && count > 0 ? (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {count}
                    </span>
                    <span className="text-xs text-muted-foreground">acciones</span>
                  </div>
                ) : null}
                {showReminders && reminderCount > 0 ? (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      {reminderCount}
                    </span>
                    <span className="text-xs text-muted-foreground">record.</span>
                  </div>
                ) : null}
                {showNotes && noteCount > 0 ? (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                      {noteCount}
                    </span>
                    <span className="text-xs text-muted-foreground">minutas</span>
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate ? (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dia seleccionado</p>
            <h4 className="mt-1 text-base font-semibold capitalize text-foreground">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h4>
          </div>

          {showNotes ? (
            <CalendarNotesPanel
              date={selectedDate}
              notes={selectedNotes}
              isLoading={notesLoading}
              isError={notesError}
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
            />
          ) : null}

          {showActions ? <div className="mt-4 rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <List className="h-4 w-4" />
                Detalle de acciones
              </h4>
              <Button variant="outline" size="sm" onClick={() => navigate(`${ROUTES.KANBAN}?fecha=${selectedDate}`)}>
                Ver en Kanban
              </Button>
            </div>
            {selectedActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin acciones este dia.</p>
            ) : (
              <ul className="space-y-2">
                {selectedActions.map((accion) => (
                  <li
                    key={accion.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
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
                        {accion.hora_limite?.slice(0, 5) ?? '--'} ·{' '}
                        {responsableNames[accion.responsable] ?? accion.responsable ?? '--'} · {accion.estado}
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
          </div> : null}
        </div>
      ) : null}

      {isLoading || commentsLoading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}

      <QuickNoteDialog
        open={noteDialogOpen}
        date={selectedDate}
        title={noteTitle}
        text={noteText}
        disabled={!currentUser?.id || createNote.isPending}
        isSaving={createNote.isPending}
        onOpenChange={setNoteDialogOpen}
        onTitleChange={setNoteTitle}
        onTextChange={setNoteText}
        onSubmit={() => {
          if (!currentUser?.id) return
          const targetDate = selectedDate ?? dateOnlyCDMX(new Date().toISOString())
          if (!noteTitle.trim() || !noteText.trim()) return
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

function CalendarNotesPanel({
  date,
  notes,
  isLoading,
  isError,
}: {
  date: string
  notes: CalendarNote[]
  isLoading: boolean
  isError: boolean
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
        <p className="text-sm font-semibold text-foreground">
          Notas del {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
        </p>
        {isError ? (
          <p className="mt-3 text-sm text-destructive">No se pudieron cargar tus notas.</p>
        ) : isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Cargando notas...</p>
        ) : notes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aun no tienes notas para este dia.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border border-border/60 bg-background px-3 py-2">
                <p className="text-sm font-semibold text-foreground">{note.titulo}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{note.texto}</p>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

function CalendarRemindersPanel({
  reminders,
  isLoading,
  isError,
  closingId,
  onComplete,
  onCreate,
}: {
  reminders: CalendarReminder[]
  isLoading: boolean
  isError: boolean
  closingId: string | null
  onComplete: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="mt-4 rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlarmClock className="h-4 w-4" aria-hidden />
          Recordatorios del dia
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Crear
        </Button>
      </div>
      {isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar tus recordatorios.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando recordatorios...</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin recordatorios para este dia.</p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className={cn(
                'rounded-md border px-3 py-2',
                reminder.completed_at
                  ? 'border-emerald-500/25 bg-emerald-500/5'
                  : 'border-border/60 bg-background'
              )}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{reminder.titulo}</p>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      reminder.completed_at ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700'
                    )}
                  >
                    {reminder.completed_at
                      ? `Cerrado ${formatReminderDateTime(reminder.completed_at)}`
                      : formatReminderDateTime(reminder.fecha_limite)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant={reminder.completed_at ? 'ghost' : 'outline'}
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={Boolean(reminder.completed_at) || closingId === reminder.id}
                  onClick={() => onComplete(reminder.id)}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {reminder.completed_at ? 'Cerrado' : closingId === reminder.id ? 'Cerrando...' : 'Cerrar'}
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{reminder.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QuickNoteDialog({
  open,
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear minuta</DialogTitle>
          <DialogDescription>
            {date ? `Se guardara en ${date}.` : 'Se guardara en el dia actual.'}
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={disabled || !title.trim() || !text.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            {isSaving ? 'Guardando...' : 'Crear minuta'}
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear recordatorio</DialogTitle>
          <DialogDescription>Al llegar la fecha limite se generara una notificacion para tu usuario.</DialogDescription>
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={disabled || !title.trim() || !deadline || !description.trim()}>
            <AlarmClock className="h-4 w-4" aria-hidden />
            {isSaving ? 'Guardando...' : 'Crear recordatorio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
