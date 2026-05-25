import { supabase } from '@/lib/supabase/client'
import type { FceRow, StrategicNorthRow } from '../types/kpi.types'

const TABLE_NORTH = 'strategic_north'
const TABLE_FCE = 'fce'

/** Última fila configurada del norte estratégico (BHAG). */
export async function fetchStrategicNorth(): Promise<StrategicNorthRow | null> {
  const { data, error } = await supabase
    .from(TABLE_NORTH)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as StrategicNorthRow | null
}

/** FCE activos ordenados por `orden`. */
export async function listActiveFces(): Promise<FceRow[]> {
  const { data, error } = await supabase
    .from(TABLE_FCE)
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return (data ?? []) as FceRow[]
}
