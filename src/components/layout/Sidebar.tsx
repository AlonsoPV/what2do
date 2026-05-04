import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
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
  BarChart3,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES, APP_NAME } from '@/constants'
import { useAppStore } from '@/store'
import { useNotifications } from '@/features/notifications'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'

/** Navegación por módulos (spec §5). */
const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.KANBAN, label: 'Kanban', icon: Columns3 },
  { to: ROUTES.DASHBOARD_KPIS, label: 'KPIs O2C', icon: LineChart },
  { to: ROUTES.DASHBOARD_GAPS, label: 'Gaps O2C', icon: FolderKanban },
  { to: ROUTES.DASHBOARD_IMPACTO, label: 'Matriz de Impacto', icon: BarChart3 },
  { to: ROUTES.ACADEMIA, label: 'Academia O2C', icon: GraduationCap },
  { to: ROUTES.DISCIPLINA, label: 'Disciplina', icon: Target },
  { to: ROUTES.CALENDARIO, label: 'Calendario', icon: Calendar },
  { to: ROUTES.REPORTES, label: 'Reportes', icon: FileBarChart },
  { to: ROUTES.NOTIFICACIONES, label: 'Notificaciones', icon: Bell },
  { to: ROUTES.MANUAL, label: 'Manual', icon: BookOpen },
  { to: ROUTES.SETTINGS, label: 'Configuración', icon: Settings },
] as const

const MOBILE_MQ = '(max-width: 1023px)'

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches
}

export function Sidebar() {
  const location = useLocation()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const { data: currentUser } = useCurrentUser()
  const { data: notifications = [] } = useNotifications(currentUser?.id, { leido: false })
  const unreadCount = notifications.length

  /** Antes del primer pintado en móvil: menú cerrado para evitar flash del overlay a pantalla completa. */
  useLayoutEffect(() => {
    if (isMobileViewport()) {
      setSidebarOpen(false)
    }
  }, [setSidebarOpen])

  /** Cerrar offcanvas con Escape solo en móvil. */
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileViewport()) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  /** Foco en el botón cerrar al abrir el panel móvil (accesibilidad). */
  useEffect(() => {
    if (!sidebarOpen || !isMobileViewport()) return
    const id = window.requestAnimationFrame(() => closeBtnRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [sidebarOpen])

  const closeMobileMenu = useCallback(() => {
    if (isMobileViewport()) {
      setSidebarOpen(false)
    }
  }, [setSidebarOpen])

  const renderNavItems = (opts: { showLabels: boolean; mobile?: boolean; onActivate?: () => void }) => {
    const { showLabels, mobile, onActivate } = opts
    return navItems.map(({ to, label, icon: Icon }) => {
      const isActive = location.pathname === to
      const showNotifBadge = to === ROUTES.NOTIFICACIONES && unreadCount > 0
      return (
        <Link
          key={to}
          to={to}
          onClick={() => onActivate?.()}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 font-medium transition-colors',
            mobile ? 'py-3.5 text-base' : 'py-2 text-sm',
            isActive
              ? 'bg-sidebar-primary text-primary-foreground shadow-sm'
              : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <span className="relative shrink-0">
            <Icon className={mobile ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden />
            {showNotifBadge ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </span>
          {showLabels ? <span className="flex-1 truncate">{label}</span> : null}
        </Link>
      )
    })
  }

  return (
    <>
      {/* Escritorio: barra lateral colapsable */}
      <aside
        className={cn(
          'hidden flex-col border-r border-sidebar-accent/50 bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out lg:flex',
          sidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Navegación principal">
          {renderNavItems({ showLabels: sidebarOpen })}
        </nav>
      </aside>

      {/* Móvil / tablet: menú a pantalla completa — sin contenido de la app visible detrás */}
      {sidebarOpen ? (
        <div
          className={cn(
            'fixed inset-0 z-[100] flex flex-col bg-sidebar text-sidebar-foreground lg:hidden',
            'duration-200 animate-in fade-in-0',
            'supports-[height:100dvh]:min-h-[100dvh]'
          )}
          style={{ minHeight: '100vh' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-nav-title"
        >
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-accent/70 px-4 shadow-sm">
            <div className="min-w-0">
              <p id="mobile-nav-title" className="truncate text-base font-semibold tracking-tight">
                {APP_NAME}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/65">Menú de navegación</p>
            </div>
            <Button
              ref={closeBtnRef}
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </header>
          <nav
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 pb-8"
            aria-label="Enlaces de la aplicación"
          >
            {renderNavItems({ showLabels: true, mobile: true, onActivate: closeMobileMenu })}
          </nav>
        </div>
      ) : null}
    </>
  )
}
