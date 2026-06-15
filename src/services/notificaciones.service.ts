/**
 * Servicio del centro de notificaciones (tabla notificaciones).
 * Spec §5.9, §11: tiempo real, filtro por tipo/prioridad, leído/no leído.
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Notificacion } from '@/types'

const TABLE = 'notificaciones'
const NOTIFICACION_SELECT = 'id,usuario_id,tipo,prioridad,leido,payload,created_at'

export interface CreateNotificacionInput {
  usuario_id: string
  tipo: string
  prioridad?: 'Normal' | 'Alta' | 'Urgente'
  payload?: Record<string, unknown>
}

export async function sendNotificationEmail(input: CreateNotificacionInput): Promise<void> {
  const { error } = await supabase.functions.invoke('send-notification-email', {
    body: {
      usuario_id: input.usuario_id,
      tipo: input.tipo,
      prioridad: input.prioridad ?? 'Normal',
      payload: input.payload ?? null,
    },
  })

  if (error) throw error
}

export const notificacionesService = {
  async sendEmail(input: CreateNotificacionInput): Promise<void> {
    await sendNotificationEmail(input)
  },

  /**
   * Inserta una notificación para otro usuario.
   * No usamos `.select()` tras el insert: la política RLS `notificaciones_select_own` solo permite
   * leer filas donde `usuario_id` es el usuario actual; al notificar al responsable, el insert es válido
   * pero el RETURNING fallaría con 403 en PostgREST.
   */
  async create(input: CreateNotificacionInput): Promise<void> {
    const { error } = await supabase.from(TABLE).insert({
      usuario_id: input.usuario_id,
      tipo: input.tipo,
      prioridad: input.prioridad ?? 'Normal',
      payload: input.payload ?? null,
    })
    if (error) throw error

    try {
      await sendNotificationEmail(input)
    } catch (emailError) {
      console.warn(
        '[notificaciones] La notificacion se creo, pero no se pudo enviar el correo.',
        emailError
      )
    }
  },

  async listByUsuario(usuarioId: string, options?: { leido?: boolean }) {
    let q = supabase
      .from(TABLE)
      .select(NOTIFICACION_SELECT)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
    if (options?.leido !== undefined) q = q.eq('leido', options.leido)
    const { data, error } = await q.limit(100)
    if (error) throw error
    return (data ?? []) as Notificacion[]
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from(TABLE)
      .update({ leido: true })
      .eq('id', id)
    if (error) throw error
  },

  async markAllAsRead(usuarioId: string) {
    const { error } = await supabase
      .from(TABLE)
      .update({ leido: true })
      .eq('usuario_id', usuarioId)
    if (error) throw error
  },

  subscribe(usuarioId: string, callback: (payload: unknown) => void): RealtimeChannel {
    const channel = supabase
      .channel(`notificaciones:${usuarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLE,
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload) => callback(payload)
      )

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') return
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn(
          '[notificaciones] Realtime no disponible; se actualizará el listado de forma periódica.',
          err?.message ?? status
        )
      }
    })

    return channel
  },

  async unsubscribe(channel: RealtimeChannel) {
    await supabase.removeChannel(channel)
  },
}
