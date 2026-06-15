import { supabase } from '@/lib/supabase/client'
import { validateTodayOrFutureDateCDMX } from '@/lib/futureDateValidation'

const TABLE = 'calendar_notes'
const CALENDAR_NOTE_SELECT = 'id,user_id,fecha,titulo,texto,created_at,updated_at'

export interface CalendarNote {
  id: string
  user_id: string
  fecha: string
  titulo: string
  texto: string
  created_at: string
  updated_at: string
}

export const calendarNotesService = {
  async listRecentByUser(userId: string, limit = 8): Promise<CalendarNote[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(CALENDAR_NOTE_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as CalendarNote[]
  },

  async listByRange(userId: string, from: string, to: string): Promise<CalendarNote[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(CALENDAR_NOTE_SELECT)
      .eq('user_id', userId)
      .gte('fecha', from)
      .lte('fecha', to)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CalendarNote[]
  },

  async listByDate(userId: string, fecha: string): Promise<CalendarNote[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(CALENDAR_NOTE_SELECT)
      .eq('user_id', userId)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CalendarNote[]
  },

  async create(input: { user_id: string; fecha: string; titulo: string; texto: string }): Promise<CalendarNote> {
    const dateError = validateTodayOrFutureDateCDMX(input.fecha, 'La fecha del elemento')
    if (dateError) throw new Error(dateError)
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: input.user_id,
        fecha: input.fecha,
        titulo: input.titulo.trim(),
        texto: input.texto.trim(),
      })
      .select(CALENDAR_NOTE_SELECT)
      .single()
    if (error) throw error
    return data as CalendarNote
  },

  async update(
    id: string,
    patch: { titulo?: string; texto?: string }
  ): Promise<CalendarNote> {
    const body: Record<string, string> = {}
    if (patch.titulo !== undefined) body.titulo = patch.titulo.trim()
    if (patch.texto !== undefined) body.texto = patch.texto.trim()
    if (Object.keys(body).length === 0) {
      const { data, error } = await supabase.from(TABLE).select(CALENDAR_NOTE_SELECT).eq('id', id).single()
      if (error) throw error
      return data as CalendarNote
    }
    const { data, error } = await supabase
      .from(TABLE)
      .update(body)
      .eq('id', id)
      .select(CALENDAR_NOTE_SELECT)
      .single()
    if (error) throw error
    return data as CalendarNote
  },
}
