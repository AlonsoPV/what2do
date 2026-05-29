import { supabase } from '@/lib/supabase/client'

const TABLE = 'calendar_notes'

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
  async listByRange(userId: string, from: string, to: string): Promise<CalendarNote[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
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
      .select('*')
      .eq('user_id', userId)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CalendarNote[]
  },

  async create(input: { user_id: string; fecha: string; titulo: string; texto: string }): Promise<CalendarNote> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: input.user_id,
        fecha: input.fecha,
        titulo: input.titulo.trim(),
        texto: input.texto.trim(),
      })
      .select()
      .single()
    if (error) throw error
    return data as CalendarNote
  },
}
