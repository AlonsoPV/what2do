import { supabase } from '@/lib/supabase/client'
import { GOOGLE_WORKSPACE_CALENDAR_SYNC_ENABLED } from '@/constants'
import { validateFutureInstant } from '@/lib/futureDateValidation'

const TABLE = 'calendar_reminders'
/** `*` evita 400 si aún no se aplicó la migración de columnas Google en Supabase. */
const CALENDAR_REMINDER_SELECT = '*'

function asCalendarReminder(row: Record<string, unknown>): CalendarReminder {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    titulo: String(row.titulo),
    descripcion: String(row.descripcion),
    fecha_limite: String(row.fecha_limite),
    notified_at: row.notified_at != null ? String(row.notified_at) : null,
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
    completed_by: row.completed_by != null ? String(row.completed_by) : null,
    google_calendar_event_id:
      row.google_calendar_event_id != null ? String(row.google_calendar_event_id) : null,
    google_task_id: row.google_task_id != null ? String(row.google_task_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export interface CalendarReminder {
  id: string
  user_id: string
  titulo: string
  descripcion: string
  fecha_limite: string
  notified_at: string | null
  completed_at: string | null
  completed_by: string | null
  google_calendar_event_id: string | null
  google_task_id: string | null
  created_at: string
  updated_at: string
}

export interface CompleteCalendarReminderResult {
  reminder: CalendarReminder
  googleSynced: boolean
  googleMessage?: string
}

export interface CreateCalendarReminderInput {
  user_id: string
  titulo: string
  descripcion: string
  fecha_limite: string
}

export const calendarRemindersService = {
  async listRecentByUser(userId: string, limit = 8): Promise<CalendarReminder[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(CALENDAR_REMINDER_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map((row) => asCalendarReminder(row as Record<string, unknown>))
  },

  async listByRange(userId: string, from: string, to: string): Promise<CalendarReminder[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(CALENDAR_REMINDER_SELECT)
      .eq('user_id', userId)
      .gte('fecha_limite', `${from}T00:00:00-06:00`)
      .lte('fecha_limite', `${to}T23:59:59-06:00`)
      .order('fecha_limite', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => asCalendarReminder(row as Record<string, unknown>))
  },

  async listDuePending(userId: string, nowIso: string): Promise<CalendarReminder[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(CALENDAR_REMINDER_SELECT)
      .eq('user_id', userId)
      .is('notified_at', null)
      .is('completed_at', null)
      .lte('fecha_limite', nowIso)
      .order('fecha_limite', { ascending: true })
      .limit(20)
    if (error) throw error
    return (data ?? []).map((row) => asCalendarReminder(row as Record<string, unknown>))
  },

  async create(input: CreateCalendarReminderInput): Promise<CalendarReminder> {
    const futureError = validateFutureInstant(input.fecha_limite, 'La fecha y hora del recordatorio')
    if (futureError) throw new Error(futureError)
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: input.user_id,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion.trim(),
        fecha_limite: input.fecha_limite,
      })
      .select(CALENDAR_REMINDER_SELECT)
      .single()
    if (error) throw error
    return asCalendarReminder(data as Record<string, unknown>)
  },

  async markNotified(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ notified_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async complete(id: string, completedBy: string): Promise<CompleteCalendarReminderResult> {
    let googleSynced = true
    let googleMessage: string | undefined

    if (GOOGLE_WORKSPACE_CALENDAR_SYNC_ENABLED) {
      try {
        const { data, error } = await supabase.functions.invoke<{
          ok?: boolean
          hadGoogleLinks?: boolean
          calendarCancelled?: boolean
          taskCompleted?: boolean
          warnings?: string[]
          message?: string
        }>('google-reminder-complete', {
          body: { reminderId: id },
        })
        if (error) {
          googleSynced = false
          googleMessage = error.message
        } else if (data?.hadGoogleLinks) {
          const hasWarning = Boolean(data.warnings?.length) || data.ok === false
          if (hasWarning) {
            googleSynced = false
            googleMessage = data.warnings?.join('; ') || data.message || 'No se pudo actualizar Google'
          }
        }
      } catch (error) {
        googleSynced = false
        googleMessage = error instanceof Error ? error.message : 'No se pudo sincronizar con Google'
      }
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        completed_at: now,
        completed_by: completedBy,
        notified_at: now,
      })
      .eq('id', id)
      .select(CALENDAR_REMINDER_SELECT)
      .single()
    if (error) throw error
    return {
      reminder: asCalendarReminder(data as Record<string, unknown>),
      googleSynced,
      googleMessage,
    }
  },
}
