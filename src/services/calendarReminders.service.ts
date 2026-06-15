import { supabase } from '@/lib/supabase/client'
import { validateFutureInstant } from '@/lib/futureDateValidation'

const TABLE = 'calendar_reminders'
const CALENDAR_REMINDER_SELECT =
  'id,user_id,titulo,descripcion,fecha_limite,notified_at,completed_at,completed_by,created_at,updated_at'

export interface CalendarReminder {
  id: string
  user_id: string
  titulo: string
  descripcion: string
  fecha_limite: string
  notified_at: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
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
    return (data ?? []) as CalendarReminder[]
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
    return (data ?? []) as CalendarReminder[]
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
    return (data ?? []) as CalendarReminder[]
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
    return data as CalendarReminder
  },

  async markNotified(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ notified_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async complete(id: string, completedBy: string): Promise<CalendarReminder> {
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
    return data as CalendarReminder
  },
}
