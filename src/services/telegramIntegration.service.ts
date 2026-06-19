import { supabase } from '@/lib/supabase/client'

export type TelegramSendActionResult = {
  ok: boolean
  telegram_message_id?: number | null
  message?: string
  warning?: string
}

export const telegramIntegrationService = {
  getBotUsername(): string {
    return (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '')
  },

  buildStartLink(token: string): string {
    const username = this.getBotUsername()
    if (!username) {
      throw new Error('Falta configurar VITE_TELEGRAM_BOT_USERNAME para vincular Telegram.')
    }
    return `https://t.me/${encodeURIComponent(username)}?start=${encodeURIComponent(token)}`
  },

  buildStartCommand(token: string): string {
    return `/start ${token}`
  },

  async createLinkToken(usuarioId?: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_telegram_link_token', {
      p_usuario_id: usuarioId ?? null,
    })
    if (error) throw error
    if (typeof data !== 'string') throw new Error('No se pudo crear token de Telegram.')
    return data
  },

  async sendAction(accionId: string, usuarioId?: string): Promise<TelegramSendActionResult> {
    const { data, error } = await supabase.functions.invoke('telegram-send-action', {
      body: {
        accion_id: accionId,
        usuario_id: usuarioId ?? undefined,
      },
    })
    if (error) throw error
    return data as TelegramSendActionResult
  },
}
