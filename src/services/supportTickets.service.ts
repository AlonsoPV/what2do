import { supabase } from '@/lib/supabase/client'
import type { SupportTicket, SupportTicketComment, TicketStatus } from '@/types'

const TICKETS_TABLE = 'support_tickets'
const COMMENTS_TABLE = 'support_ticket_comments'

export interface SupportTicketsFilter {
  status?: TicketStatus | 'todos'
  tipo?: string
  modulo?: string
  search?: string
}

export type SupportTicketInput = Pick<
  SupportTicket,
  | 'titulo'
  | 'descripcion'
  | 'modulo'
  | 'tipo'
  | 'prioridad'
  | 'impacto'
  | 'pasos_reproduccion'
  | 'resultado_esperado'
  | 'resultado_actual'
> & {
  status?: TicketStatus
  created_by?: string
  updated_by?: string | null
}

function normalizeInput(input: Partial<SupportTicketInput>): Partial<SupportTicketInput> {
  const next = { ...input }
  if (typeof next.titulo === 'string') next.titulo = next.titulo.trim()
  if (typeof next.descripcion === 'string') next.descripcion = next.descripcion.trim()
  if (typeof next.modulo === 'string') next.modulo = next.modulo.trim()
  if (typeof next.tipo === 'string') next.tipo = next.tipo.trim()
  if (typeof next.prioridad === 'string') next.prioridad = next.prioridad.trim()
  for (const key of ['impacto', 'pasos_reproduccion', 'resultado_esperado', 'resultado_actual'] as const) {
    if (typeof next[key] === 'string') next[key] = next[key]!.trim() || null
  }
  return next
}

export const supportTicketsService = {
  async list(filter: SupportTicketsFilter = {}): Promise<SupportTicket[]> {
    let q = supabase.from(TICKETS_TABLE).select('*')
    if (filter.status && filter.status !== 'todos') q = q.eq('status', filter.status)
    if (filter.tipo) q = q.eq('tipo', filter.tipo)
    if (filter.modulo) q = q.eq('modulo', filter.modulo)
    q = q.order('created_at', { ascending: false })
    const { data, error } = await q
    if (error) throw error
    let rows = (data ?? []) as SupportTicket[]
    if (filter.search?.trim()) {
      const term = filter.search.trim().toLowerCase()
      rows = rows.filter(
        (ticket) =>
          ticket.titulo.toLowerCase().includes(term) ||
          ticket.descripcion.toLowerCase().includes(term) ||
          ticket.modulo.toLowerCase().includes(term)
      )
    }
    return rows
  },

  async getById(id: string): Promise<SupportTicket> {
    const { data, error } = await supabase.from(TICKETS_TABLE).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('No se encontro el ticket o no tienes permiso para verlo.')
    return data as SupportTicket
  },

  async create(input: SupportTicketInput): Promise<SupportTicket> {
    const payload = normalizeInput(input)
    const { data, error } = await supabase.from(TICKETS_TABLE).insert(payload).select().maybeSingle()
    if (error) throw error
    if (!data) throw new Error('El ticket se guardo, pero no se pudo leer con tu perfil.')
    return data as SupportTicket
  },

  async update(id: string, input: Partial<SupportTicketInput>): Promise<SupportTicket> {
    const payload = normalizeInput(input)
    const nextStatus = payload.status
    if (nextStatus === 'Cerrado') {
      ;(payload as Partial<SupportTicket>).closed_at = new Date().toISOString()
    } else if (nextStatus) {
      ;(payload as Partial<SupportTicket>).closed_at = null
    }
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('No se pudo actualizar el ticket.')
    return data as SupportTicket
  },

  async updateStatus(id: string, status: TicketStatus, updatedBy?: string | null): Promise<SupportTicket> {
    return this.update(id, { status, updated_by: updatedBy ?? null })
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TICKETS_TABLE).delete().eq('id', id)
    if (error) throw error
  },
}

export const supportTicketCommentsService = {
  async countByTicketIds(ticketIds: string[]): Promise<Record<string, number>> {
    if (ticketIds.length === 0) return {}
    const { data, error } = await supabase
      .from(COMMENTS_TABLE)
      .select('ticket_id')
      .in('ticket_id', ticketIds)
    if (error) throw error
    const counts: Record<string, number> = {}
    for (const id of ticketIds) counts[id] = 0
    for (const row of data ?? []) {
      const id = (row as { ticket_id: string }).ticket_id
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  },

  async listByTicket(ticketId: string): Promise<SupportTicketComment[]> {
    const { data, error } = await supabase
      .from(COMMENTS_TABLE)
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as SupportTicketComment[]
  },

  async create(input: {
    ticket_id: string
    contenido: string
    created_by?: string | null
  }): Promise<SupportTicketComment> {
    const { data, error } = await supabase
      .from(COMMENTS_TABLE)
      .insert({
        ticket_id: input.ticket_id,
        contenido: input.contenido.trim(),
        created_by: input.created_by ?? null,
      })
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('No se pudo publicar el comentario.')
    return data as SupportTicketComment
  },
}
