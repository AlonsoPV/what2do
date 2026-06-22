import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Columns3, Calendar, BookOpen, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES, APP_NAME } from '@/constants'
import { useAppStore } from '@/store'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { canAccessRouteByRole } from '@/features/auth/lib/permissions'
import { Button } from '@/components/ui/button'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

/** Navegación visible en el tablero (módulos ocultos se controlan en permissions). */
const navItems: NavItem[] = [
  { to: ROUTES.KANBAN, label: 'Kanban', icon: Columns3 },
  { to: ROUTES.CALENDARIO, label: 'Calendario', icon: Calendar },
  { to: ROUTES.MANUAL, label: 'Manual', icon: BookOpen },
]

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
  const visibleNavItems = navItems.filter((item) => canAccessRouteByRole(currentUser?.rol, item.to))

  useLayoutEffect(() => {
    if (isMobileViewport()) {
      setSidebarOpen(false)
    }
  }, [setSidebarOpen])

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

  const renderNavLink = (
    item: NavItem,
    opts: { showLabels: boolean; mobile?: boolean; onActivate?: () => void }
  ) => {
    const { showLabels, mobile, onActivate } = opts
    const { to, label, icon: Icon } = item
    const isActive = location.pathname === to
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
        <Icon className={mobile ? 'h-6 w-6' : 'h-5 w-5 shrink-0'} aria-hidden />
        {showLabels ? <span className="flex-1 truncate">{label}</span> : null}
      </Link>
    )
  }

  return (
    <>
      <aside
        className={cn(
          'hidden flex-col border-r border-sidebar-accent/50 bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out lg:flex',
          sidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2" aria-label="Navegación principal">
          {visibleNavItems.map((item) => renderNavLink(item, { showLabels: sidebarOpen }))}
        </nav>
      </aside>

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
            {visibleNavItems.map((item) => renderNavLink(item, { showLabels: true, mobile: true, onActivate: closeMobileMenu }))}
          </nav>
        </div>
      ) : null}
    </>
  )
}
