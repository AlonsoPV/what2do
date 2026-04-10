import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  Columns3,
  Target,
  Calendar,
  FileBarChart,
  Bell,
  BookOpen,
  GraduationCap,
  LineChart,
  FolderKanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useAppStore } from '@/store'
import { useNotifications } from '@/features/notifications'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'

/** Navegación por módulos (spec §5). */
const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.KANBAN, label: 'Kanban', icon: Columns3 },
  { to: ROUTES.DASHBOARD_KPIS, label: 'KPIs O2C', icon: LineChart },
  { to: ROUTES.DASHBOARD_GAPS, label: 'Gaps O2C', icon: FolderKanban },
  { to: ROUTES.ACADEMIA, label: 'Academia O2C', icon: GraduationCap },
  { to: ROUTES.DISCIPLINA, label: 'Disciplina', icon: Target },
  { to: ROUTES.CALENDARIO, label: 'Calendario', icon: Calendar },
  { to: ROUTES.REPORTES, label: 'Reportes', icon: FileBarChart },
  { to: ROUTES.NOTIFICACIONES, label: 'Notificaciones', icon: Bell },
  { to: ROUTES.MANUAL, label: 'Manual', icon: BookOpen },
  { to: ROUTES.SETTINGS, label: 'Configuración', icon: Settings },
] as const

export function Sidebar() {
  const location = useLocation()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const { data: currentUser } = useCurrentUser()
  const { data: notifications = [] } = useNotifications(currentUser?.id, { leido: false })
  const unreadCount = notifications.length

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-accent/50 bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
        sidebarOpen ? 'w-56' : 'w-16'
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          const showNotifBadge = to === ROUTES.NOTIFICACIONES && unreadCount > 0
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {showNotifBadge && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              {sidebarOpen && <span className="flex-1 truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
