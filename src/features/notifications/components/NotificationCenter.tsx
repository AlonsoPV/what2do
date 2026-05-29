/**
 * Centro de notificaciones (spec §5.9).
 * Comentarios, asignaciones, cambios de estado. Filtro por tipo/prioridad, marcar leído.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import type { Notificacion } from '@/types'
import { Link } from 'react-router-dom'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import { Bell, Check, CheckCheck, MessageSquare, UserPlus, AlertCircle, ExternalLink, AlarmClock } from 'lucide-react'

const TIPO_LABELS: Record<string, string> = {
  comentario: 'Comentario',
  comentario_asignado: 'Te asignaron en un comentario',
  responsable: 'Te asignaron como responsable',
  estado: 'Cambio de estado',
  evidencia: 'Evidencia cargada',
  bloqueo: 'Bloqueo',
  recordatorio_calendario: 'Recordatorio',
}

const TIPO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  comentario: MessageSquare,
  comentario_asignado: UserPlus,
  responsable: UserPlus,
  estado: Bell,
  evidencia: Bell,
  bloqueo: AlertCircle,
  recordatorio_calendario: AlarmClock,
}

function getTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo
}

function NotificacionItem({
  n,
  onMarkRead,
}: {
  n: Notificacion
  onMarkRead: (id: string) => void
}) {
  const Icon = TIPO_ICONS[n.tipo] ?? Bell
  const payload = (n.payload ?? {}) as { titulo?: string; mensaje?: string; accion_id?: string }
  const accionId = payload.accion_id

  return (
    <div
      className={`
        flex gap-3 rounded-lg border p-3 text-left transition-colors
        ${n.leido ? 'border-border/60 bg-muted/20' : 'border-primary/30 bg-primary/5'}
      `}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {payload.titulo ?? getTipoLabel(n.tipo)}
        </p>
        {payload.mensaje && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {payload.mensaje}
          </p>
        )}
        {accionId && (
          <Link
            to={`/kanban?accion=${accionId}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver acción
          </Link>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {formatDateTimeCDMX(n.created_at)}
          {n.prioridad !== 'Normal' && (
            <span className="ml-2 font-medium text-amber-600">{n.prioridad}</span>
          )}
        </p>
      </div>
      {!n.leido && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onMarkRead(n.id)}
          aria-label="Marcar leído"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
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
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead(currentUser?.id ?? '')

  if (isLoadingUser) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    )
  }
  if (isErrorUser || !currentUser) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {isErrorUser ? 'No se pudo cargar tu perfil. Verifica que tengas sesión activa.' : 'Inicia sesión para ver notificaciones'}
        </p>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.leido).length
  const hasUnread = filterLeido === 'all' ? unreadCount > 0 : filterLeido === 'unread' && notifications.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterLeido} onValueChange={(v) => setFilterLeido(v as 'all' | 'unread' | 'read')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">No leídas</SelectItem>
              <SelectItem value="read">Leídas</SelectItem>
            </SelectContent>
          </Select>
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Marcar todas leídas
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-amber-600">No se pudieron cargar las notificaciones. Revisa la consola o la política RLS.</p>
      ) : isLoadingNotif ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16">
          <Bell className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">Sin notificaciones</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Recibirás avisos de comentarios, asignaciones y cambios de estado
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificacionItem n={n} onMarkRead={(id) => markRead.mutate(id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
