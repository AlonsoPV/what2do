import { supabase } from '@/lib/supabase/client'

export type WhatsAppSendActionResult = {
  ok: boolean
  whatsapp_message_id?: string | null
  wa_id?: string | null
  message?: string
  warning?: string
}

export type WhatsAppSendActionMessageType = 'initial' | 'checkpoint_followup' | 'commitment_close'

export type WhatsAppIdentity = {
  id: string
  usuario_id: string
  external_chat_id: string
  external_user_id: string
  external_username: string | null
  display_name: string | null
  status: string
  verified_at: string | null
  updated_at: string
}

export function whatsappSummary(identity: WhatsAppIdentity | null | undefined): string {
  if (!identity?.external_chat_id) return 'Sin vincular'
  return identity.external_chat_id
}

type FunctionErrorWithContext = Error & {
  context?: {
    clone?: () => Response
    json?: () => Promise<unknown>
  }
}

function isWhatsAppSendActionResult(value: unknown): value is WhatsAppSendActionResult {
  return typeof value === 'object' && value !== null && 'ok' in value
}

async function messageFromFunctionError(error: unknown): Promise<string | null> {
  const context = (error as FunctionErrorWithContext | null)?.context
  const response = typeof context?.clone === 'function' ? context.clone() : context
  if (!response || typeof response.json !== 'function') return null

  try {
    const body = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message?: unknown }).message
      return typeof message === 'string' && message.trim() ? message : null
    }
  } catch {
    return null
  }
  return null
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '')
}

export const whatsappIntegrationService = {
  async getIdentity(usuarioId: string): Promise<WhatsAppIdentity | null> {
    const { data, error } = await supabase
      .from('user_channel_identities')
      .select('id,usuario_id,external_chat_id,external_user_id,external_username,display_name,status,verified_at,updated_at')
      .eq('usuario_id', usuarioId)
      .eq('channel', 'whatsapp')
      .maybeSingle()
    if (error) throw error
    return data as WhatsAppIdentity | null
  },

  async adminUpsertIdentity(input: {
    usuarioId: string
    phone: string
    displayName?: string
  }): Promise<string> {
    const phone = normalizePhone(input.phone)
    const { data, error } = await supabase.rpc('admin_upsert_whatsapp_identity', {
      p_usuario_id: input.usuarioId,
      p_phone: phone,
      p_display_name: input.displayName?.trim() || null,
    })
    if (error) throw error
    if (typeof data !== 'string') throw new Error('No se pudo activar WhatsApp para el usuario.')
    return data
  },

  async sendAction(
    accionId: string,
    usuarioId?: string,
    options?: {
      messageType?: WhatsAppSendActionMessageType
      checkpointId?: string
      to?: string
    }
  ): Promise<WhatsAppSendActionResult> {
    const { data, error } = await supabase.functions.invoke('whatsapp-send-action', {
      body: {
        accion_id: accionId,
        usuario_id: usuarioId ?? undefined,
        message_type: options?.messageType ?? 'initial',
        checkpoint_id: options?.checkpointId ?? undefined,
        to: options?.to ? normalizePhone(options.to) : undefined,
      },
    })
    if (error) {
      throw new Error((await messageFromFunctionError(error)) ?? error.message)
    }
    if (!isWhatsAppSendActionResult(data)) {
      throw new Error('Respuesta inesperada al enviar WhatsApp.')
    }
    if (!data.ok) {
      throw new Error(data.message || 'No se pudo enviar WhatsApp.')
    }
    return data
  },
}
