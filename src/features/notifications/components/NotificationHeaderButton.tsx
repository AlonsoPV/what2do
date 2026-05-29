import { Link, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'
import { useDueCalendarReminderNotifications, useNotifications } from '../hooks/useNotifications'

type Props = {
  userId: string | undefined
}

export function NotificationHeaderButton({ userId }: Props) {
  const location = useLocation()
  useDueCalendarReminderNotifications(userId)
  const { data: notifications = [] } = useNotifications(userId, { leido: false })
  const unreadCount = notifications.length
  const isActive = location.pathname === ROUTES.NOTIFICACIONES

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="icon"
      className="relative shrink-0"
      asChild
    >
      <Link
        to={ROUTES.NOTIFICACIONES}
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span
            className={cn(
              'absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center',
              'rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
