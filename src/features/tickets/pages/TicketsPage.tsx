import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  LifeBuoy,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { cn } from '@/lib/utils'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import { notificacionesService } from '@/services/notificaciones.service'
import { useDropdownOptionsByKey } from '@/features/catalogs/hooks/useDropdownOptions'
import { isSuperAdminByRole } from '@/features/auth/lib/permissions'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { useUsers } from '@/features/users/hooks/useUsers'
import {
  useCreateTicket,
  useCreateTicketComment,
  useDeleteTicket,
  useTicketCommentCounts,
  useTicketComments,
  useTicket,
  useTickets,
  useUpdateTicket,
  useUpdateTicketStatus,
} from '../hooks/useTickets'
import type { SupportTicket, TicketStatus } from '@/types'

const STATUS_ORDER: TicketStatus[] = ['Nuevo', 'En proceso', 'Respuesta', 'Cerrado']

const STATUS_META: Record<TicketStatus, { icon: typeof CircleDot; accent: string; bg: string; description: string }> = {
  Nuevo: {
    icon: CircleDot,
    accent: 'border-l-sky-400 text-sky-600',
    bg: 'bg-sky-500/5',
    description: 'Ticket recibido y pendiente de revision.',
  },
  'En proceso': {
    icon: Wrench,
    accent: 'border-l-amber-400 text-amber-600',
    bg: 'bg-amber-500/5',
    description: 'Ya se esta trabajando o evaluando.',
  },
  Respuesta: {
    icon: MessageSquare,
    accent: 'border-l-violet-400 text-violet-600',
    bg: 'bg-violet-500/5',
    description: 'Hay respuesta o se requiere validacion del solicitante.',
  },
  Cerrado: {
    icon: CheckCircle2,
    accent: 'border-l-emerald-400 text-emerald-600',
    bg: 'bg-emerald-500/5',
    description: 'Ticket resuelto o descartado.',
  },
}

const PRIORITY_BADGE: Record<string, string> = {
  baja: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  media: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  alta: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  urgente: 'bg-red-500/10 text-red-700 dark:text-red-300',
}

const TICKET_TOOLBAR_BTN =
  'h-11 min-h-11 w-full min-w-0 justify-center gap-1.5 px-2 text-[11px] font-semibold leading-tight shadow-sm sm:h-10 sm:min-h-10 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm'

const TICKET_TOOLBAR_PRIMARY_BTN =
  'flex-col gap-0.5 shadow-md ring-2 ring-primary/25 sm:flex-row sm:gap-2'

const TICKET_TOOLBAR_FIELD =
  'h-11 min-h-11 w-full min-w-0 border-2 border-border bg-card text-[11px] font-medium shadow-sm sm:h-10 sm:min-h-10 sm:text-sm'

const TICKET_TOOLBAR_FIELD_ACTIVE =
  'border-primary/50 bg-primary/5 ring-2 ring-primary/15'

function optionLabel(options: { label: string; value: string }[], value: string | null | undefined) {
  return options.find((option) => option.value === value)?.label ?? value ?? '-'
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function resolveCreatorName(
  createdBy: string | null | undefined,
  creatorNames: Record<string, string>
) {
  if (!createdBy) return 'Usuario desconocido'
  return creatorNames[createdBy] ?? 'Usuario'
}

type NotifyInput = {
  ticket: SupportTicket
  tipo: string
  titulo: string
  mensaje: string
  actorId?: string | null
  actorNombre?: string | null
  users: { id: string; nombre: string; rol: string }[]
}

async function notifyTicketStakeholders({ ticket, tipo, titulo, mensaje, actorId, actorNombre, users }: NotifyInput) {
  const recipients = new Set<string>()
  for (const user of users) {
    if (isSuperAdminByRole(user.rol) && user.id !== actorId) recipients.add(user.id)
  }
  if (ticket.created_by && ticket.created_by !== actorId) recipients.add(ticket.created_by)

  await Promise.allSettled(
    [...recipients].map((usuario_id) =>
      notificacionesService.create({
        usuario_id,
        tipo,
        prioridad: ticket.prioridad === 'urgente' ? 'Urgente' : ticket.prioridad === 'alta' ? 'Alta' : 'Normal',
        payload: {
          titulo,
          mensaje,
          ticket_id: ticket.id,
          ticket_titulo: ticket.titulo,
          ticket_status: ticket.status,
          autor_id: actorId,
          autor_nombre: actorNombre,
        },
      })
    )
  )
}

function TicketCard({
  ticket,
  commentCount,
  onOpen,
  canDrag,
  moduleLabel,
  typeLabel,
  creatorName,
}: {
  ticket: SupportTicket
  commentCount: number
  onOpen: (ticket: SupportTicket) => void
  canDrag: boolean
  moduleLabel: string
  typeLabel: string
  creatorName: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
    disabled: !canDrag,
  })
  return (
    <div ref={setNodeRef} data-ticket-id={ticket.id}>
      <TicketCardInner
        ticket={ticket}
        commentCount={commentCount}
        moduleLabel={moduleLabel}
        typeLabel={typeLabel}
        creatorName={creatorName}
        isDragging={isDragging}
        dragHandleProps={{ attributes, listeners }}
        onOpen={() => onOpen(ticket)}
      />
    </div>
  )
}

function TicketCardInner({
  ticket,
  commentCount,
  moduleLabel,
  typeLabel,
  creatorName,
  isDragging,
  isOverlay,
  dragHandleProps,
  onOpen,
}: {
  ticket: SupportTicket
  commentCount: number
  moduleLabel: string
  typeLabel: string
  creatorName: string
  isDragging?: boolean
  isOverlay?: boolean
  dragHandleProps?: { attributes: object; listeners?: object }
  onOpen?: () => void
}) {
  return (
    <article
      {...(dragHandleProps?.attributes ?? {})}
      {...(dragHandleProps?.listeners ?? {})}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      className={cn(
        'group rounded-xl border border-border/60 bg-card p-3.5 text-left shadow-sm transition-all',
        !isOverlay && 'cursor-grab hover:border-border hover:shadow-md active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-40',
        isOverlay && 'w-[280px] cursor-grabbing shadow-xl ring-2 ring-primary/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{ticket.titulo}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">ID {shortId(ticket.id)}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={`Creado por ${creatorName}`}>
            Creado por {creatorName}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-70"
          onClick={(event) => {
            event.stopPropagation()
            onOpen?.()
          }}
          aria-label="Editar ticket"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{ticket.descripcion}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="max-w-full truncate text-[11px] font-normal">
          {moduleLabel}
        </Badge>
        <Badge variant="secondary" className="text-[11px] font-normal">
          {typeLabel}
        </Badge>
        <span
          className={cn(
            'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
            PRIORITY_BADGE[ticket.prioridad] ?? PRIORITY_BADGE.media
          )}
        >
          {ticket.prioridad}
        </span>
        {commentCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded bg-muted/80 px-1.5 py-0.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        ) : null}
      </div>
    </article>
  )
}

function TicketsColumn({
  status,
  tickets,
  counts,
  onOpen,
  onNew,
  canManage,
  moduleOptions,
  typeOptions,
  creatorNames,
}: {
  status: TicketStatus
  tickets: SupportTicket[]
  counts: Record<string, number>
  onOpen: (ticket: SupportTicket) => void
  onNew: () => void
  canManage: boolean
  moduleOptions: { label: string; value: string }[]
  typeOptions: { label: string; value: string }[]
  creatorNames: Record<string, string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-[min(300px,calc(100vw-1.25rem))] shrink-0 snap-start flex-col rounded-2xl border border-border/50 border-l-4 sm:w-[300px]',
        meta.accent,
        meta.bg,
        isOver && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background'
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            <h2 className="truncate text-sm font-semibold text-foreground">{status}</h2>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {tickets.length}
        </span>
      </header>
      <div className="flex min-h-[220px] flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4">
        {tickets.length === 0 ? (
          <div className="flex min-h-[170px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center">
            <LifeBuoy className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">Sin tickets</p>
            <Button type="button" variant="ghost" size="sm" className="mt-2 gap-1.5" onClick={onNew}>
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              commentCount={counts[ticket.id] ?? 0}
              onOpen={onOpen}
              canDrag={canManage}
              moduleLabel={optionLabel(moduleOptions, ticket.modulo)}
              typeLabel={optionLabel(typeOptions, ticket.tipo)}
              creatorName={resolveCreatorName(ticket.created_by, creatorNames)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function TicketsBoard({
  tickets,
  counts,
  onOpen,
  onNew,
  canManage,
  moduleOptions,
  typeOptions,
  creatorNames,
}: {
  tickets: SupportTicket[]
  counts: Record<string, number>
  onOpen: (ticket: SupportTicket) => void
  onNew: () => void
  canManage: boolean
  moduleOptions: { label: string; value: string }[]
  typeOptions: { label: string; value: string }[]
  creatorNames: Record<string, string>
}) {
  const { data: currentUser } = useCurrentUser()
  const { data: users = [] } = useUsers({ activo: true })
  const updateStatus = useUpdateTicketStatus()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeId) ?? null, [activeId, tickets])
  const byStatus = useMemo(() => {
    const map: Record<TicketStatus, SupportTicket[]> = {
      Nuevo: [],
      'En proceso': [],
      Respuesta: [],
      Cerrado: [],
    }
    for (const ticket of tickets) map[ticket.status]?.push(ticket)
    return map
  }, [tickets])

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    if (!canManage) {
      toast.error('Solo super admin puede cambiar el estatus de tickets.')
      return
    }
    const nextStatus = STATUS_ORDER.find((status) => status === event.over?.id)
    const ticket = tickets.find((item) => item.id === event.active.id)
    if (!nextStatus || !ticket || ticket.status === nextStatus) return
    updateStatus.mutate(
      { id: ticket.id, status: nextStatus, updatedBy: currentUser?.id },
      {
        onSuccess: async (saved) => {
          await notifyTicketStakeholders({
            ticket: saved,
            users,
            actorId: currentUser?.id,
            actorNombre: currentUser?.nombre,
            tipo: 'ticket_actualizado',
            titulo: 'Ticket actualizado',
            mensaje: `El ticket ${saved.titulo} cambio a ${saved.status}.`,
          })
          toast.success('Estatus actualizado')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al actualizar estatus'),
      }
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex snap-x gap-4 overflow-x-auto overscroll-x-contain pb-4 pt-1 sm:gap-5">
        {STATUS_ORDER.map((status) => (
          <TicketsColumn
            key={status}
            status={status}
            tickets={byStatus[status]}
            counts={counts}
            onOpen={onOpen}
            onNew={onNew}
            canManage={canManage}
            moduleOptions={moduleOptions}
            typeOptions={typeOptions}
            creatorNames={creatorNames}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTicket ? (
          <TicketCardInner
            ticket={activeTicket}
            commentCount={counts[activeTicket.id] ?? 0}
            moduleLabel={optionLabel(moduleOptions, activeTicket.modulo)}
            typeLabel={optionLabel(typeOptions, activeTicket.tipo)}
            creatorName={resolveCreatorName(activeTicket.created_by, creatorNames)}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

const TICKET_TEXTAREA_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'

function FormSection({
  title,
  description,
  children,
  className,
  collapsible,
  expanded = true,
  onToggle,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  const header = (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {collapsible ? (
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        ) : null}
      </div>
      {description && (!collapsible || expanded) ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )

  if (collapsible) {
    return (
      <section className={cn('space-y-4', className)}>
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full rounded-md text-left transition-colors hover:bg-muted/30"
          aria-expanded={expanded}
        >
          {header}
        </button>
        {expanded ? children : null}
      </section>
    )
  }

  return (
    <section className={cn('space-y-4', className)}>
      {header}
      {children}
    </section>
  )
}

function TicketDialog({
  open,
  ticket,
  onOpenChange,
  onSaved,
  moduleOptions,
  typeOptions,
  priorityOptions,
  impactOptions,
  creatorNames,
}: {
  open: boolean
  ticket: SupportTicket | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  moduleOptions: { label: string; value: string }[]
  typeOptions: { label: string; value: string }[]
  priorityOptions: { label: string; value: string }[]
  impactOptions: { label: string; value: string }[]
  creatorNames: Record<string, string>
}) {
  const { data: currentUser } = useCurrentUser()
  const { data: users = [] } = useUsers({ activo: true })
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()
  const deleteTicket = useDeleteTicket()
  const isEdit = Boolean(ticket)
  const canDelete = isSuperAdminByRole(currentUser?.rol)
  const canEdit = !isEdit || isSuperAdminByRole(currentUser?.rol)
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    modulo: 'kanban',
    tipo: 'mejora',
    prioridad: 'media',
    impacto: 'individual',
    status: 'Nuevo' as TicketStatus,
    pasos_reproduccion: '',
    resultado_esperado: '',
    resultado_actual: '',
  })
  const [technicalDetailExpanded, setTechnicalDetailExpanded] = useState(false)

  useEffect(() => {
    if (!open) return
    const pasos = ticket?.pasos_reproduccion ?? ''
    const esperado = ticket?.resultado_esperado ?? ''
    const actual = ticket?.resultado_actual ?? ''
    setForm({
      titulo: ticket?.titulo ?? '',
      descripcion: ticket?.descripcion ?? '',
      modulo: ticket?.modulo ?? moduleOptions[0]?.value ?? 'kanban',
      tipo: ticket?.tipo ?? typeOptions[0]?.value ?? 'mejora',
      prioridad: ticket?.prioridad ?? priorityOptions[1]?.value ?? 'media',
      impacto: ticket?.impacto ?? impactOptions[0]?.value ?? 'individual',
      status: ticket?.status ?? 'Nuevo',
      pasos_reproduccion: pasos,
      resultado_esperado: esperado,
      resultado_actual: actual,
    })
    setTechnicalDetailExpanded(Boolean(ticket && (pasos || esperado || actual)))
  }, [impactOptions, moduleOptions, open, priorityOptions, ticket, typeOptions])

  const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentUser?.id) {
      toast.error('No se pudo resolver tu usuario.')
      return
    }
    if (ticket && !canEdit) {
      toast.error('Solo super admin puede editar tickets.')
      return
    }
    const payload = {
      ...form,
      impacto: form.impacto || null,
      pasos_reproduccion: form.pasos_reproduccion || null,
      resultado_esperado: form.resultado_esperado || null,
      resultado_actual: form.resultado_actual || null,
      updated_by: currentUser.id,
    }
    try {
      const saved = ticket
        ? await updateTicket.mutateAsync({ id: ticket.id, input: payload })
        : await createTicket.mutateAsync({ ...payload, created_by: currentUser.id })
      await notifyTicketStakeholders({
        ticket: saved,
        users,
        actorId: currentUser.id,
        actorNombre: currentUser.nombre,
        tipo: ticket ? 'ticket_actualizado' : 'ticket_creado',
        titulo: ticket ? 'Ticket actualizado' : 'Nuevo ticket creado',
        mensaje: `${currentUser.nombre} ${ticket ? 'actualizo' : 'creo'} el ticket ${saved.titulo}.`,
      })
      toast.success(ticket ? 'Ticket actualizado' : 'Ticket creado')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el ticket')
    }
  }

  const handleDelete = async () => {
    if (!ticket || !window.confirm('Eliminar este ticket de forma permanente?')) return
    try {
      await deleteTicket.mutateAsync(ticket.id)
      toast.success('Ticket eliminado')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el ticket')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-2 border-b border-border/60 px-6 py-5">
          <DialogTitle>{isEdit ? 'Editar ticket' : 'Nuevo ticket'}</DialogTitle>
          <DialogDescription className="text-left">
            {isEdit && ticket ? (
              <>
                ID {shortId(ticket.id)} · Creado por {resolveCreatorName(ticket.created_by, creatorNames)} ·{' '}
                {formatDateTimeCDMX(ticket.created_at)}
                {!canEdit ? ' · Solo lectura (edita super admin)' : null}
              </>
            ) : (
              <>
                Describe tu solicitud con claridad: cuanto mas contexto, mas rapido podremos atenderla.
                {currentUser?.nombre ? (
                  <span className="mt-1 block text-muted-foreground">
                    Se registrara a nombre de {currentUser.nombre}.
                  </span>
                ) : null}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-6 px-6 py-5">
            <FormSection
              title="Que necesitas"
              description="Resume el problema o la mejora en pocas palabras y explica el contexto."
            >
              {isEdit && ticket ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Creado por </span>
                  <span className="font-medium text-foreground">
                    {resolveCreatorName(ticket.created_by, creatorNames)}
                  </span>
                </div>
              ) : null}
              <div className="grid gap-4">
                <Field
                  label="Titulo"
                  htmlFor="ticket-titulo"
                  hint="Frase corta que identifique el ticket de un vistazo."
                >
                  <Input
                    id="ticket-titulo"
                    value={form.titulo}
                    onChange={(e) => setField('titulo', e.target.value)}
                    disabled={!canEdit}
                    required
                    maxLength={120}
                    placeholder="Ej. No puedo mover acciones en el Kanban"
                  />
                </Field>
                <Field
                  label="Descripcion"
                  htmlFor="ticket-descripcion"
                  hint="Minimo 10 caracteres. Incluye que hiciste, que esperabas y que ocurrio."
                >
                  <textarea
                    id="ticket-descripcion"
                    value={form.descripcion}
                    onChange={(e) => setField('descripcion', e.target.value)}
                    disabled={!canEdit}
                    required
                    rows={4}
                    className={TICKET_TEXTAREA_CLASS}
                    placeholder={
                      'Ej. Al arrastrar una accion de Pendiente a En proceso, la tarjeta vuelve a su columna original.\n' +
                      'Ocurre en Chrome con mi usuario operativo desde el tablero principal.'
                    }
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Clasificacion"
              description="Ayuda al equipo a priorizar y asignar el ticket al area correcta."
              className="border-t border-border/60 pt-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Modulo" htmlFor="ticket-modulo" hint="Pantalla o area de la plataforma afectada.">
                  <Select value={form.modulo} onValueChange={(value) => setField('modulo', value)} disabled={!canEdit}>
                    <SelectTrigger id="ticket-modulo">
                      <SelectValue placeholder="Selecciona el modulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo" htmlFor="ticket-tipo" hint="Error: falla actual. Mejora: idea nueva. Cambio: ajuste solicitado.">
                  <Select value={form.tipo} onValueChange={(value) => setField('tipo', value)} disabled={!canEdit}>
                    <SelectTrigger id="ticket-tipo">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Prioridad" htmlFor="ticket-prioridad" hint="Urgente solo si bloquea trabajo critico del dia.">
                  <Select value={form.prioridad} onValueChange={(value) => setField('prioridad', value)} disabled={!canEdit}>
                    <SelectTrigger id="ticket-prioridad">
                      <SelectValue placeholder="Selecciona la prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Impacto" htmlFor="ticket-impacto" hint="Cuantas personas o procesos se ven afectados.">
                  <Select value={form.impacto} onValueChange={(value) => setField('impacto', value)} disabled={!canEdit}>
                    <SelectTrigger id="ticket-impacto">
                      <SelectValue placeholder="Selecciona el impacto" />
                    </SelectTrigger>
                    <SelectContent>
                      {impactOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSection>

            <FormSection
              title="Detalle tecnico"
              description={
                form.tipo === 'error'
                  ? 'Recomendado para errores: ayuda a reproducir y validar la solucion.'
                  : 'Opcional. Agrega pasos o resultados si aportan contexto extra.'
              }
              className="border-t border-border/60 pt-6"
              collapsible
              expanded={technicalDetailExpanded}
              onToggle={() => setTechnicalDetailExpanded((prev) => !prev)}
            >
              <div className="grid gap-4">
                <Field
                  label="Pasos para reproducir"
                  htmlFor="ticket-pasos"
                  hint="Lista numerada: que hacer antes de que aparezca el problema."
                >
                  <textarea
                    id="ticket-pasos"
                    value={form.pasos_reproduccion}
                    onChange={(e) => setField('pasos_reproduccion', e.target.value)}
                    disabled={!canEdit}
                    rows={3}
                    className={TICKET_TEXTAREA_CLASS}
                    placeholder={
                      '1. Entrar a Operaciones > Kanban\n' +
                      '2. Arrastrar una tarjeta a otra columna\n' +
                      '3. Soltar la tarjeta'
                    }
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Resultado esperado" htmlFor="ticket-esperado" hint="Que deberia pasar si todo funciona bien.">
                    <textarea
                      id="ticket-esperado"
                      value={form.resultado_esperado}
                      onChange={(e) => setField('resultado_esperado', e.target.value)}
                      disabled={!canEdit}
                      rows={3}
                      className={TICKET_TEXTAREA_CLASS}
                      placeholder="Ej. La tarjeta queda en la columna destino y el estatus se guarda."
                    />
                  </Field>
                  <Field label="Resultado actual" htmlFor="ticket-actual" hint="Que ocurre hoy en la plataforma.">
                    <textarea
                      id="ticket-actual"
                      value={form.resultado_actual}
                      onChange={(e) => setField('resultado_actual', e.target.value)}
                      disabled={!canEdit}
                      rows={3}
                      className={TICKET_TEXTAREA_CLASS}
                      placeholder="Ej. La tarjeta regresa a la columna original sin mensaje de error."
                    />
                  </Field>
                </div>
              </div>
            </FormSection>

            {isEdit && canEdit ? (
              <FormSection
                title="Gestion interna"
                description="Solo visible para super admin al editar un ticket existente."
                className="border-t border-border/60 pt-6"
              >
                <div className="grid gap-4 sm:max-w-xs">
                  <Field label="Estatus" htmlFor="ticket-status" hint={STATUS_META[form.status].description}>
                    <Select value={form.status} onValueChange={(value) => setField('status', value as TicketStatus)} disabled={!canEdit}>
                      <SelectTrigger id="ticket-status">
                        <SelectValue placeholder="Selecciona el estatus" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FormSection>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {ticket && canDelete ? (
                <Button type="button" variant="destructive" className="gap-1.5" onClick={() => void handleDelete()}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              {canEdit ? (
                <Button type="submit" disabled={createTicket.isPending || updateTicket.isPending}>
                  {isEdit ? 'Guardar cambios' : 'Crear ticket'}
                </Button>
              ) : null}
            </div>
          </div>
        </form>
        {ticket ? (
          <div className="border-t border-border/60 px-6 pb-6">
            <TicketComments
              ticket={ticket}
              users={users}
              currentUserId={currentUser?.id ?? null}
              currentUserName={currentUser?.nombre ?? null}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  htmlFor,
  className,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  className?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  )
}

function TicketComments({
  ticket,
  users,
  currentUserId,
  currentUserName,
}: {
  ticket: SupportTicket
  users: { id: string; nombre: string; rol: string }[]
  currentUserId: string | null
  currentUserName: string | null
}) {
  const { data: comments = [], isLoading } = useTicketComments(ticket.id)
  const createComment = useCreateTicketComment(ticket.id)
  const [contenido, setContenido] = useState('')
  const userNames = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user.nombre])), [users])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const text = contenido.trim()
    if (!text) return
    try {
      await createComment.mutateAsync({ ticket_id: ticket.id, contenido: text, created_by: currentUserId })
      setContenido('')
      await notifyTicketStakeholders({
        ticket,
        users,
        actorId: currentUserId,
        actorNombre: currentUserName,
        tipo: 'ticket_comentario',
        titulo: 'Nuevo comentario en ticket',
        mensaje: text.slice(0, 200),
      })
      toast.success('Comentario publicado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el comentario')
    }
  }

  return (
    <SectionCard className="mt-2">
      <SectionCardHeader
        title="Comentarios"
        subtitle="Seguimiento, respuesta del equipo y acuerdos del ticket."
        icon={MessageSquare}
        action={<Badge variant="secondary">{comments.length}</Badge>}
      />
      <SectionCardBody className="space-y-4">
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando comentarios...</p>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Sin comentarios aun</p>
            </div>
          ) : (
            comments.map((comment) => {
              const author = comment.created_by ? userNames[comment.created_by] ?? 'Usuario' : 'Usuario'
              return (
                <article key={comment.id} className="flex gap-3 rounded-xl border border-border/50 bg-background/80 p-3 text-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {userInitials(author)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{author}</span>
                      <time className="text-[11px] text-muted-foreground">{formatDateTimeCDMX(comment.created_at)}</time>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{comment.contenido}</p>
                  </div>
                </article>
              )
            })
          )}
        </div>
        <form onSubmit={(event) => void handleSubmit(event)} className="rounded-xl border border-border/60 bg-muted/10 p-3">
          <textarea
            value={contenido}
            onChange={(event) => setContenido(event.target.value)}
            rows={3}
            placeholder="Escribe una respuesta o seguimiento..."
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" className="gap-1.5" disabled={!contenido.trim() || createComment.isPending}>
              <Send className="h-4 w-4" />
              Publicar
            </Button>
          </div>
        </form>
      </SectionCardBody>
    </SectionCard>
  )
}

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TicketStatus | 'todos'>('todos')
  const { data: moduleOptionsRaw = [] } = useDropdownOptionsByKey('ticket_modulos')
  const { data: currentUser } = useCurrentUser()
  const { data: users = [] } = useUsers({ activo: true })
  const creatorNames = useMemo(() => {
    const map: Record<string, string> = {}
    if (currentUser?.id) map[currentUser.id] = currentUser.nombre
    for (const user of users) map[user.id] = user.nombre
    return map
  }, [currentUser?.id, currentUser?.nombre, users])
  const { data: typeOptionsRaw = [] } = useDropdownOptionsByKey('ticket_tipos')
  const { data: priorityOptionsRaw = [] } = useDropdownOptionsByKey('ticket_prioridades')
  const { data: impactOptionsRaw = [] } = useDropdownOptionsByKey('ticket_impactos')
  const moduleOptions = moduleOptionsRaw.filter((option) => option.activo)
  const typeOptions = typeOptionsRaw.filter((option) => option.activo)
  const priorityOptions = priorityOptionsRaw.filter((option) => option.activo)
  const impactOptions = impactOptionsRaw.filter((option) => option.activo)
  const { data: tickets = [], isLoading, isError, error, refetch } = useTickets({ search, status })
  const hasActiveFilters = search.trim() !== '' || status !== 'todos'
  const ticketIdFromUrl = searchParams.get('ticket')
  const { data: ticketFromUrl } = useTicket(ticketIdFromUrl)
  const ticketIds = useMemo(() => tickets.map((ticket) => ticket.id), [tickets])
  const { data: counts = {} } = useTicketCommentCounts(ticketIds)
  const canManage = isSuperAdminByRole(currentUser?.rol)

  const openNew = useCallback(() => {
    setEditingTicket(null)
    setDialogOpen(true)
  }, [])
  const openEdit = useCallback((ticket: SupportTicket) => {
    setEditingTicket(ticket)
    setDialogOpen(true)
  }, [])
  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingTicket(null)
  }, [])

  useEffect(() => {
    if (!ticketFromUrl || !ticketIdFromUrl) return
    setEditingTicket(ticketFromUrl)
    setDialogOpen(true)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('ticket')
      return next
    }, { replace: true })
  }, [setSearchParams, ticketFromUrl, ticketIdFromUrl])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-6 overflow-x-hidden px-3 py-5 sm:px-6 sm:py-6">
      <header className="min-w-0 space-y-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <LifeBuoy className="h-4 w-4" />
            Mesa de ayuda
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Tickets</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Registra errores, mejoras o cambios. Veras tus tickets; super admin ve y administra todos.
          </p>
        </div>

        <div
          className={cn(
            'tickets-toolbar grid w-full min-w-0 grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm ring-1 ring-border/30 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:p-3'
          )}
        >
          <Button
            type="button"
            className={cn('tickets-btn-new gap-1.5', TICKET_TOOLBAR_BTN, TICKET_TOOLBAR_PRIMARY_BTN)}
            onClick={openNew}
            size="sm"
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span className="truncate sm:hidden">Nuevo</span>
            <span className="hidden truncate sm:inline">Nuevo ticket</span>
          </Button>

          <div className="contents sm:flex sm:flex-1 sm:items-center sm:justify-end sm:gap-3 sm:pl-2">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-3"
                aria-hidden
              />
              <Input
                id="ticket-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar"
                className={cn(
                  'tickets-search pl-8 sm:pl-9',
                  TICKET_TOOLBAR_FIELD,
                  search.trim() !== '' && TICKET_TOOLBAR_FIELD_ACTIVE
                )}
              />
            </div>

            <div className="relative min-w-0 sm:w-48">
              <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus | 'todos')}>
                <SelectTrigger
                  id="ticket-filter-status"
                  className={cn(
                    'tickets-filter-status',
                    TICKET_TOOLBAR_FIELD,
                    status !== 'todos' && TICKET_TOOLBAR_FIELD_ACTIVE
                  )}
                >
                  <SelectValue placeholder="Estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_ORDER.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters ? (
                <span
                  className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full border border-card bg-primary shadow-sm sm:right-1.5 sm:top-1.5 sm:h-2.5 sm:w-2.5 sm:border-2"
                  aria-label="Filtros activos"
                />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {isError ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-semibold text-foreground">No se pudieron cargar los tickets.</p>
          <p className="max-w-md text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Revisa permisos o conexion.'}</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>Reintentar</Button>
        </div>
      ) : isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {STATUS_ORDER.map((item) => (
            <div key={item} className="h-80 w-[300px] shrink-0 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <TicketsBoard
          tickets={tickets}
          counts={counts}
          onOpen={openEdit}
          onNew={openNew}
          canManage={canManage}
          moduleOptions={moduleOptions}
          typeOptions={typeOptions}
          creatorNames={creatorNames}
        />
      )}

      <TicketDialog
        open={dialogOpen}
        ticket={editingTicket}
        onOpenChange={(open) => {
          if (!open) closeDialog()
          else setDialogOpen(true)
        }}
        onSaved={closeDialog}
        moduleOptions={moduleOptions.length ? moduleOptions : [{ label: 'Kanban', value: 'kanban' }]}
        typeOptions={typeOptions.length ? typeOptions : [{ label: 'Mejora', value: 'mejora' }, { label: 'Error', value: 'error' }, { label: 'Cambio', value: 'cambio' }]}
        priorityOptions={priorityOptions.length ? priorityOptions : [{ label: 'Baja', value: 'baja' }, { label: 'Media', value: 'media' }, { label: 'Alta', value: 'alta' }, { label: 'Urgente', value: 'urgente' }]}
        impactOptions={impactOptions.length ? impactOptions : [{ label: 'Individual', value: 'individual' }, { label: 'Equipo', value: 'equipo' }, { label: 'Operacion', value: 'operacion' }]}
        creatorNames={creatorNames}
      />
    </div>
  )
}
