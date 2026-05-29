import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { canAccessRouteByRole, isAnalystByRole, isSuperAdminByRole } from '@/features/auth/lib/permissions'
import {
  Users,
  FolderOpen,
  Shield,
  MapPin,
  Flag,
  ArrowUpCircle,
  List,
  Target,
  UserCircle,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react'

const SETTINGS_LINKS = [
  { to: ROUTES.SETTINGS_PROFILE, label: 'Mi perfil', icon: UserCircle },
  { to: ROUTES.SETTINGS_USERS, label: 'Usuarios', icon: Users },
  { to: ROUTES.SETTINGS_ACADEMY_MODULES, label: 'Academia', icon: GraduationCap, superAdminOnly: true },
  { to: ROUTES.SETTINGS_CATALOGS, label: 'Catálogos', icon: FolderOpen },
] as const

const CATALOG_LINKS = [
  { to: ROUTES.SETTINGS_CATALOGS, label: 'Inicio', icon: FolderOpen },
  { to: ROUTES.SETTINGS_CATALOGS_ROLES, label: 'Roles', icon: Shield },
  { to: ROUTES.SETTINGS_CATALOGS_AREAS, label: 'Áreas', icon: MapPin },
  { to: ROUTES.SETTINGS_CATALOGS_STATUSES, label: 'Estatus', icon: Flag },
  { to: ROUTES.SETTINGS_CATALOGS_PRIORITIES, label: 'Prioridades', icon: ArrowUpCircle },
  { to: ROUTES.SETTINGS_CATALOGS_DROPDOWNS, label: 'Listas desplegables', icon: List },
  { to: ROUTES.SETTINGS_CATALOGS_KPIS, label: 'KPIs', icon: Target },
  { to: ROUTES.SETTINGS_CATALOGS_GAPS, label: 'Brechas O2C', icon: AlertTriangle },
] as const

export function SettingsLayout() {
  const location = useLocation()
  const { profile } = useAuth()
  const visibleSettingsLinks = SETTINGS_LINKS.filter(
    (link) => canAccessRouteByRole(profile?.rol, link.to) && (!('superAdminOnly' in link) || isSuperAdminByRole(profile?.rol))
  )
  const visibleCatalogLinks = CATALOG_LINKS.filter((link) => canAccessRouteByRole(profile?.rol, link.to))
  const isCatalogs = location.pathname.startsWith('/settings/catalogs')

  if (isAnalystByRole(profile?.rol) && location.pathname !== ROUTES.SETTINGS_PROFILE) {
    return <Navigate to={ROUTES.SETTINGS_PROFILE} replace />
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <nav className="shrink-0 space-y-1 lg:w-52">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Configuración</p>
        {visibleSettingsLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === to || location.pathname.startsWith(to + '/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        {isCatalogs && visibleCatalogLinks.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Catálogos</p>
            {visibleCatalogLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === to || (to !== ROUTES.SETTINGS_CATALOGS && location.pathname.startsWith(to + '/'))
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
