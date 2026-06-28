import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { canAccessRouteByRole, isAnalystByRole } from '@/features/auth/lib/permissions'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageCircle, UserCircle, type LucideIcon } from 'lucide-react'

const SETTINGS_LINKS = [
  { to: ROUTES.SETTINGS_PROFILE, label: 'Mi perfil', icon: UserCircle },
  { to: ROUTES.SETTINGS_WHATSAPP, label: 'WhatsApp', icon: MessageCircle },
] as const

type NavLink = { to: string; label: string; icon: LucideIcon }

function resolveSettingsValue(pathname: string, links: readonly NavLink[]): string {
  const match = links.find(
    (link) => pathname === link.to || pathname.startsWith(`${link.to}/`)
  )
  return match?.to ?? links[0]?.to ?? ROUTES.SETTINGS_PROFILE
}

function NavSelect({
  id,
  label,
  value,
  placeholder,
  links,
  onNavigate,
  className,
}: {
  id: string
  label: string
  value?: string
  placeholder?: string
  links: readonly NavLink[]
  onNavigate: (to: string) => void
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onNavigate}>
        <SelectTrigger id={id} className="h-10 bg-background/80 text-left shadow-sm">
          <SelectValue placeholder={placeholder ?? 'Seleccionar…'} />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-[min(20rem,70dvh)]">
          {links.map(({ to, label: itemLabel, icon: Icon }) => (
            <SelectItem key={to} value={to}>
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>{itemLabel}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function SettingsLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const visibleSettingsLinks = SETTINGS_LINKS.filter((link) =>
    canAccessRouteByRole(profile?.rol, link.to)
  )

  if (isAnalystByRole(profile?.rol) && location.pathname !== ROUTES.SETTINGS_PROFILE) {
    return <Navigate to={ROUTES.SETTINGS_PROFILE} replace />
  }

  const settingsValue = resolveSettingsValue(location.pathname, visibleSettingsLinks)

  return (
    <div className="min-w-0 space-y-4 lg:flex lg:flex-row lg:items-start lg:gap-6 lg:space-y-0 xl:gap-8">
      <aside className="min-w-0 shrink-0 lg:w-56 xl:w-60">
        <div
          className={cn(
            'sticky top-0 z-30 space-y-3 rounded-xl border border-border/60 bg-card/95 p-3 shadow-sm backdrop-blur-sm',
            'supports-[backdrop-filter]:bg-card/90'
          )}
        >
          <NavSelect
            id="settings-nav-configuracion"
            label="Configuración"
            value={settingsValue}
            links={visibleSettingsLinks}
            onNavigate={(to) => navigate(to)}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-2 lg:pb-4">
        <Outlet />
      </main>
    </div>
  )
}
