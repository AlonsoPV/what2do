import { supabase } from '@/lib/supabase/client'

export type WhatsAppFollowupSettings = {
  followup_delay_minutes: number
  followups_per_day: number
}

export const DEFAULT_WHATSAPP_FOLLOWUP_SETTINGS: WhatsAppFollowupSettings = {
  followup_delay_minutes: 5,
  followups_per_day: 1,
}

const WHATSAPP_FOLLOWUP_KEY = 'whatsapp_followup'

function normalizeSettings(value: unknown): WhatsAppFollowupSettings {
  const source = typeof value === 'object' && value !== null
    ? value as Partial<WhatsAppFollowupSettings>
    : {}
  return {
    followup_delay_minutes: Math.min(
      240,
      Math.max(1, Number(source.followup_delay_minutes ?? DEFAULT_WHATSAPP_FOLLOWUP_SETTINGS.followup_delay_minutes))
    ),
    followups_per_day: Math.min(
      12,
      Math.max(0, Number(source.followups_per_day ?? DEFAULT_WHATSAPP_FOLLOWUP_SETTINGS.followups_per_day))
    ),
  }
}

export const appSettingsService = {
  async getWhatsAppFollowup(): Promise<WhatsAppFollowupSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', WHATSAPP_FOLLOWUP_KEY)
      .maybeSingle()
    if (error) throw error
    return normalizeSettings(data?.value)
  },

  async saveWhatsAppFollowup(input: WhatsAppFollowupSettings): Promise<WhatsAppFollowupSettings> {
    const value = normalizeSettings(input)
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        key: WHATSAPP_FOLLOWUP_KEY,
        value,
        description: 'Configuracion de seguimientos automaticos por WhatsApp.',
      }, { onConflict: 'key' })
      .select('value')
      .single()
    if (error) throw error
    return normalizeSettings(data.value)
  },
}
