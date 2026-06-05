/**
 * Centro de notificaciones (spec §5.9).
 * Comentarios, asignaciones, cambios de estado. Filtro por tipo/prioridad, marcar leído.
 */

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications'
import { useNotificationAccionMeta } from '../hooks/useNotificationAccionMeta'
import {
  notificacionEventoLabel,
  parseNotificacionPayload,
  resolveAccionDescripcion,
  resolveAccionTitulo,
  resolveComentarioPreview,
  resolveCreadorNombre,
} from '../utils/notificacionDisplay'
import type { AccionMetaForNotificacion } from '../hooks/useNotificationAccionMeta'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { Notificacion } from '@/types'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  UserPlus,
  AlertCircle,
  ExternalLink,
  AlarmClock,
  ChevronDown,
} from 'lucide-react'

const TIPO_LABELS: Record<string, string> = {
  comentario: 'Comentario',
  comentario_asignado: 'Te etiquetaron en un comentario',
  responsable: 'Te asignaron como responsable',
  estado: 'Cambio de estado',
  evidencia: 'Evidencia cargada',
  bloqueo: 'Bloqueo',
  recordatorio_calendario: 'Recordatorio',
  ticket_creado: 'Ticket creado',
  ticket_actualizado: 'Ticket actualizado',
  ticket_comentario: 'Comentario en ticket',
}

const TIPO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  comentario: MessageSquare,
  comentario_asignado: UserPlus,
  responsable: UserPlus,
  estado: Bell,
  evidencia: Bell,
  bloqueo: AlertCircle,
  recordatorio_calendario: AlarmClock,
  ticket_creado: Bell,
  ticket_actualizado: Bell,
  ticket_comentario: MessageSquare,
}

function getTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo
}

function NotificacionItem({
  n,
  accionMeta,
  onMarkRead,
}: {
  n: Notificacion
  accionMeta?: AccionMetaForNotificacion
  onMarkRead: (id: string) => void
}) {
  const Icon = TIPO_ICONS[n.tipo] ?? Bell
  const payload = parseNotificacionPayload(n.payload as Record<string, unknown> | null)
  const accionId = payload.accion_id
  const ticketId = payload.ticket_id
  const tipoLabel = payload.titulo ?? getTipoLabel(n.tipo)
  const tituloAccion = resolveAccionTitulo(payload, accionMeta)
  const tituloTicket = payload.ticket_titulo?.trim()
  const descripcionAccion = resolveAccionDescripcion(payload, accionMeta)
  const creadorNombre = resolveCreadorNombre(payload, accionMeta)
  const eventoLabel = notificacionEventoLabel(n.tipo, payload)
  const comentarioPreview = resolveComentarioPreview(n.tipo, payload.mensaje)
  const headline = tituloAccion || tituloTicket || tipoLabel
  const hasAccionContext = Boolean(tituloAccion || accionId)
  const hasTicketContext = Boolean(tituloTicket || ticketId)
  const kanbanLink = accionId ? `/kanban?accion=${accionId}` : null
  const ticketLink = ticketId ? `${ROUTES.TICKETS}?ticket=${ticketId}` : null

  return (
    <details
      className={cn(
        'notificacion-item group relative rounded-xl border text-left transition-colors',
        n.leido
          ? 'border-border/40 bg-card shadow-none'
          : 'border-primary/20 bg-card shadow-sm ring-1 ring-primary/10'
      )}
    >
      {!n.leido && (
        <span
          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary"
          aria-hidden
        />
      )}

      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2 px-3 py-3 pl-4 sm:gap-3 sm:px-4 sm:py-3.5 sm:pl-5',
          '[&::-webkit-details-marker]:hidden'
        )}
      >
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-foreground sm:text-[0.9375rem]">
          {headline}
        </h3>

        {kanbanLink ? (
          <Link
            to={kanbanLink}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 hover:underline"
          >
            Ir a acción
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}
        {!kanbanLink && ticketLink ? (
          <Link
            to={ticketLink}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 hover:underline"
          >
            Ir a ticket
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}

        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-muted/60"
          aria-hidden
        >
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
        </span>

        {!n.leido ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onMarkRead(n.id)
            }}
            aria-label="Marcar leído"
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : null}
      </summary>

      <div className="border-t border-border/30 px-3 pb-4 pl-4 pt-3 sm:px-5 sm:pb-5 sm:pl-5">
        <div className="flex gap-3.5 sm:gap-4">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              n.leido ? 'bg-muted/60' : 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-5 w-5', n.leido ? 'text-muted-foreground' : 'text-primary')} />
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            {(hasAccionContext && tituloAccion) || hasTicketContext ? (
              <span className="inline-flex max-w-full items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {hasTicketContext && payload.ticket_status ? `${tipoLabel} · ${payload.ticket_status}` : tipoLabel}
              </span>
            ) : null}

            {descripcionAccion ? (
              <p className="text-[0.9375rem] leading-[1.55] text-muted-foreground">{descripcionAccion}</p>
            ) : null}

            {(creadorNombre || eventoLabel) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {creadorNombre ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-1">
                    <span className="text-muted-foreground/80">Creó</span>
                    <span className="font-medium text-foreground/90">{creadorNombre}</span>
                  </span>
                ) : null}
                {eventoLabel ? (
                  <span className="inline-flex items-center rounded-md border border-border/60 px-2 py-1 font-medium text-foreground/80">
                    {eventoLabel}
                  </span>
                ) : null}
              </div>
            )}

            {comentarioPreview ? (
              <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2.5 text-[0.8125rem] leading-[1.5] text-muted-foreground">
                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                  Comentario
                </span>
                <span>{comentarioPreview}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatDateTimeCDMX(n.created_at)}
                {n.prioridad !== 'Normal' && (
                  <span className="ml-1.5 font-semibold text-amber-600">{n.prioridad}</span>
                )}
              </p>
              {kanbanLink ? (
                <Link
                  to={kanbanLink}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Ir a acción
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
              {!kanbanLink && ticketLink ? (
                <Link
                  to={ticketLink}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Ir a ticket
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}

export function NotificationCenter() {
  const { data: currentUser, isLoading: isLoadingUser, isError: isErrorUser } = useCurrentUser()
  const [filterLeido, setFilterLeido] = useState<'all' | 'unread' | 'read'>('all')
  const { data: notifications = [], isLoading: isLoadingNotif, isError } = useNotifications(
    currentUser?.id,
    filterLeido === 'unread'
      ? { leido: false, subscribe: false }
      : filterLeido === 'read'
        ? { leido: true, subscribe: false }
        : { subscribe: false }
  )
  const { data: users = [] } = useUsers({ activo: true })
  const userNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const u of users) map[u.id] = u.nombre
    return map
  }, [users])
  const { byAccionId } = useNotificationAccionMeta(notifications, userNames)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead(currentUser?.id ?? '')

  if (isLoadingUser) {
    return (
      <div className="flex h-48 items-center justify-center px-6 py-12">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    )
  }
  if (isErrorUser || !currentUser) {
    return (
      <div className="flex h-48 items-center justify-center px-6 py-12 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isErrorUser
            ? 'No se pudo cargar tu perfil. Verifica que tengas sesión activa.'
            : 'Inicia sesión para ver notificaciones'}
        </p>
      </div>
    )
  }

  const unreadInList = notifications.filter((n) => !n.leido).length
  const hasUnread =
    filterLeido === 'all' ? unreadInList > 0 : filterLeido === 'unread' && notifications.length > 0

  const filterSummary =
    filterLeido === 'unread'
      ? 'No leídas'
      : filterLeido === 'read'
        ? 'Leídas'
        : 'Todas'

  return (
    <div className="notificaciones-center flex min-h-0 flex-col">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border/50 bg-card/95 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Select value={filterLeido} onValueChange={(v) => setFilterLeido(v as 'all' | 'unread' | 'read')}>
            <SelectTrigger className="h-9 w-[148px] bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">No leídas</SelectItem>
              <SelectItem value="read">Leídas</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {notifications.length}{' '}
            {notifications.length === 1 ? 'notificación' : 'notificaciones'}
            <span className="hidden sm:inline"> · {filterSummary}</span>
          </span>
          {filterLeido === 'all' && unreadInList > 0 ? (
            <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {unreadInList} sin leer
            </span>
          ) : null}
        </div>
        {hasUnread ? (
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 self-start sm:self-center"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Marcar todas leídas
          </Button>
        ) : null}
      </div>

      <div className="notificaciones-feed flex-1 px-3 py-4 sm:px-5 sm:py-5">
        {isError ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            No se pudieron cargar las notificaciones. Revisa la consola o la política RLS.
          </p>
        ) : isLoadingNotif ? (
          <div className="space-y-3 rounded-xl bg-muted/25 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <Bell className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">Sin notificaciones</p>
            <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Cuando te asignen, comenten o cambien el estado de una acción, aparecerá aquí.
            </p>
          </div>
        ) : (
          <ul
            className="flex max-h-[min(70vh,42rem)] flex-col gap-1.5 overflow-y-auto overscroll-y-contain rounded-xl bg-muted/20 p-2 sm:gap-2 sm:p-3"
            role="list"
          >
            {notifications.map((n) => {
              const p = parseNotificacionPayload(n.payload as Record<string, unknown> | null)
              const meta = p.accion_id ? byAccionId[p.accion_id] : undefined
              return (
                <li key={n.id} className="list-none">
                  <NotificacionItem n={n} accionMeta={meta} onMarkRead={(id) => markRead.mutate(id)} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
