import { supabase } from '@/lib/supabase/client'
import { GOOGLE_WORKSPACE_CALENDAR_SYNC_ENABLED } from '@/constants'

export type GoogleWorkspaceSource = 'accion' | 'recordatorio' | 'minuta'
export type GoogleWorkspaceTarget = 'task' | 'gmail'

export interface GoogleWorkspaceSyncInput {
  source: GoogleWorkspaceSource
  target: GoogleWorkspaceTarget
  title: string
  description?: string
  /** Fecha compromiso / límite (YYYY-MM-DD). */
  date?: string
  /** Fin del periodo (ISO). */
  dueAt?: string
  /** Inicio del periodo (ISO), p. ej. created_at de la acción. */
  createdAt?: string
  actionId?: string
  reminderId?: string
  responsibleUserId?: string | null
  attendees?: string[]
}

export interface GoogleWorkspaceSyncResult {
  ok: boolean
  target: GoogleWorkspaceTarget
  id?: string | null
  url?: string | null
  meetUrl?: string | null
  recipients?: string[]
  message?: string
}

export const googleWorkspaceService = {
  async sync(input: GoogleWorkspaceSyncInput): Promise<GoogleWorkspaceSyncResult> {
    if (!GOOGLE_WORKSPACE_CALENDAR_SYNC_ENABLED) {
      throw new Error('La sincronización con Google está desactivada')
    }
    const { data, error } = await supabase.functions.invoke<GoogleWorkspaceSyncResult>('google-workspace-sync', {
      body: input,
    })
    if (error) throw error
    if (!data?.ok) throw new Error(data?.message || 'No se pudo sincronizar con Google')
    return data
  },
}
