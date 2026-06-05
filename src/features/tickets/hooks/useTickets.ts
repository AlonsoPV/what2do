import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  supportTicketCommentsService,
  supportTicketsService,
  type SupportTicketInput,
  type SupportTicketsFilter,
} from '@/services/supportTickets.service'
import type { SupportTicket, TicketStatus } from '@/types'

const KEY = ['supportTickets'] as const
const COMMENTS_KEY = ['supportTicketComments'] as const

export function useTickets(filter: SupportTicketsFilter = {}) {
  return useQuery({
    queryKey: [...KEY, filter],
    queryFn: () => supportTicketsService.list(filter),
  })
}

export function useTicket(id: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => supportTicketsService.getById(id!),
    enabled: Boolean(id),
  })
}

export function useTicketCommentCounts(ticketIds: string[]) {
  return useQuery({
    queryKey: [...COMMENTS_KEY, 'counts', ticketIds],
    queryFn: () => supportTicketCommentsService.countByTicketIds(ticketIds),
    enabled: ticketIds.length > 0,
  })
}

export function useTicketComments(ticketId: string | null | undefined) {
  return useQuery({
    queryKey: [...COMMENTS_KEY, ticketId],
    queryFn: () => supportTicketCommentsService.listByTicket(ticketId!),
    enabled: Boolean(ticketId),
  })
}

function invalidateTickets(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' })
  qc.invalidateQueries({ queryKey: COMMENTS_KEY, refetchType: 'active' })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SupportTicketInput) => supportTicketsService.create(input),
    onSuccess: () => invalidateTickets(qc),
  })
}

export function useUpdateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SupportTicketInput> }) =>
      supportTicketsService.update(id, input),
    onSuccess: (ticket) => {
      qc.setQueryData<SupportTicket>([...KEY, ticket.id], ticket)
      invalidateTickets(qc)
    },
  })
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, updatedBy }: { id: string; status: TicketStatus; updatedBy?: string | null }) =>
      supportTicketsService.updateStatus(id, status, updatedBy),
    onSuccess: (ticket) => {
      qc.setQueryData<SupportTicket>([...KEY, ticket.id], ticket)
      invalidateTickets(qc)
    },
  })
}

export function useDeleteTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supportTicketsService.delete(id),
    onSuccess: () => invalidateTickets(qc),
  })
}

export function useCreateTicketComment(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { ticket_id: string; contenido: string; created_by?: string | null }) =>
      supportTicketCommentsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...COMMENTS_KEY, ticketId] })
      qc.invalidateQueries({ queryKey: [...COMMENTS_KEY, 'counts'] })
    },
  })
}
