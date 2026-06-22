import { supabase } from '@/lib/supabase/client'

export type TelegramSendActionResult = {
  ok: boolean
  telegram_message_id?: number | null
  message?: string
  warning?: string
}

export type TelegramIdentity = {
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

type FunctionErrorWithContext = Error & {
  context?: {
    clone?: () => Response
    json?: () => Promise<unknown>
  }
}

function isTelegramSendActionResult(value: unknown): value is TelegramSendActionResult {
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

export const telegramIntegrationService = {
  async createLinkToken(usuarioId?: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_telegram_link_token', {
      p_usuario_id: usuarioId ?? null,
    })
    if (error) throw error
    if (typeof data !== 'string') throw new Error('No se pudo crear token de Telegram.')
    return data
  },

  async getIdentity(usuarioId: string): Promise<TelegramIdentity | null> {
    const { data, error } = await supabase
      .from('user_channel_identities')
      .select('id,usuario_id,external_chat_id,external_user_id,external_username,display_name,status,verified_at,updated_at')
      .eq('usuario_id', usuarioId)
      .eq('channel', 'telegram')
      .maybeSingle()
    if (error) throw error
    return data as TelegramIdentity | null
  },

  async adminUpsertIdentity(input: {
    usuarioId: string
    externalChatId: string
    externalUserId?: string
    externalUsername?: string
    displayName?: string
  }): Promise<string> {
    const { data, error } = await supabase.rpc('admin_upsert_telegram_identity', {
      p_usuario_id: input.usuarioId,
      p_external_chat_id: input.externalChatId,
      p_external_user_id: input.externalUserId?.trim() || null,
      p_external_username: input.externalUsername?.trim() || null,
      p_display_name: input.displayName?.trim() || null,
    })
    if (error) throw error
    if (typeof data !== 'string') throw new Error('No se pudo activar Telegram para el usuario.')
    return data
  },

  async sendAction(accionId: string, usuarioId?: string): Promise<TelegramSendActionResult> {
    const { data, error } = await supabase.functions.invoke('telegram-send-action', {
      body: {
        accion_id: accionId,
        usuario_id: usuarioId ?? undefined,
      },
    })
    if (error) {
      throw new Error((await messageFromFunctionError(error)) ?? error.message)
    }
    if (!isTelegramSendActionResult(data)) {
      throw new Error('Respuesta inesperada al enviar Telegram.')
    }
    if (!data.ok) {
      throw new Error(data.message || 'No se pudo enviar Telegram.')
    }
    return data
  },
}
