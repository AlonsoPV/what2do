import { supabase } from '@/lib/supabase/client'

const TABLE = 'calendar_reminders'

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
  async listByRange(userId: string, from: string, to: string): Promise<CalendarReminder[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
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
      .select('*')
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
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: input.user_id,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion.trim(),
        fecha_limite: input.fecha_limite,
      })
      .select()
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
      .select()
      .single()
    if (error) throw error
    return data as CalendarReminder
  },
}
