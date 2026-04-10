/**
 * Eventos acción ↔ gap (tabla gap_actions_log). No escribe mediciones ni KPI.
 */

import { supabase } from '@/lib/supabase/client'

const TABLE = 'gap_actions_log'

export type GapActionLogEventType = 'action_completed' | 'action_verified'

export const gapActionsLogService = {
  async insertEvent(params: {
    gapId: string
    accionId: string
    eventType: GapActionLogEventType
    createdBy?: string | null
    payload?: Record<string, unknown>
  }) {
    const { error } = await supabase.from(TABLE).insert({
      gap_id: params.gapId,
      accion_id: params.accionId,
      event_type: params.eventType,
      created_by: params.createdBy ?? null,
      payload: params.payload ?? null,
    })
    if (error) throw error
  },
}
