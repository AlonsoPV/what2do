import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FolderOpen, Users, Shield, MapPinned, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { canAccessRouteByRole } from '@/features/auth/lib/permissions'

type DirectoriosTab = {
  to: string
  label: string
  icon: LucideIcon
  isActive?: (pathname: string) => boolean
}

const DIRECTORIOS_TABS: DirectoriosTab[] = [
  {
    to: ROUTES.DIRECTORIOS_USUARIOS,
    label: 'Usuarios',
    icon: Users,
    isActive: (pathname) =>
      pathname === ROUTES.DIRECTORIOS_USUARIOS || pathname.startsWith('/directorios/usuarios/'),
  },
  { to: ROUTES.DIRECTORIOS_ROLES, label: 'Roles', icon: Shield },
  { to: ROUTES.DIRECTORIOS_AREAS, label: 'Áreas', icon: MapPinned },
]

function tabIsActive(tab: DirectoriosTab, pathname: string): boolean {
  if (tab.isActive) return tab.isActive(pathname)
  return pathname === tab.to || pathname.startsWith(`${tab.to}/`)
}

export function DirectoriosLayout() {
  const location = useLocation()
  const { profile } = useAuth()

  const visibleTabs = DIRECTORIOS_TABS.filter((tab) =>
    canAccessRouteByRole(profile?.rol, tab.to)
  )

  if (visibleTabs.length === 0) {
    return <Navigate to={ROUTES.KANBAN} replace />
  }

  const onUsersDetail =
    location.pathname.startsWith('/directorios/usuarios/') &&
    location.pathname !== ROUTES.DIRECTORIOS_USUARIOS

  return (
    <div className="directorios-layout mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administración
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Directorios
            </h1>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-muted/25 p-1 shadow-sm"
          aria-label="Secciones de directorios"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const active = tabIsActive(tab, location.pathname)
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === ROUTES.DIRECTORIOS_USUARIOS}
                className={cn(
                  'inline-flex min-w-0 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{tab.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {onUsersDetail ? (
          <p className="text-sm text-muted-foreground">Detalle de usuario</p>
        ) : null}
      </header>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
