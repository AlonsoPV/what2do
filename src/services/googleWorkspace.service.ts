import { supabase } from '@/lib/supabase/client'

export type GoogleWorkspaceSource = 'accion' | 'recordatorio' | 'minuta'
export type GoogleWorkspaceTarget = 'calendar' | 'calendar_meet' | 'task' | 'gmail'

export interface GoogleWorkspaceSyncInput {
  source: GoogleWorkspaceSource
  target: GoogleWorkspaceTarget
  title: string
  description?: string
  date?: string
  dueAt?: string
  actionId?: string
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
    const { data, error } = await supabase.functions.invoke<GoogleWorkspaceSyncResult>('google-workspace-sync', {
      body: input,
    })
    if (error) throw error
    if (!data?.ok) throw new Error(data?.message || 'No se pudo sincronizar con Google')
    return data
  },
}
