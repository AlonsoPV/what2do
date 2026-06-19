import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard, SectionCardBody } from '@/components/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCurrentUser, useUpdateUser } from '../hooks'
import { EditProfileDialog } from '../components/EditProfileDialog'
import { telegramIntegrationService } from '@/services/telegramIntegration.service'
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function formatDateLong(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatRelativeAccess(iso: string | null | undefined): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60_000)
  const hr = Math.floor(min / 60)
  const days = Math.floor(hr / 24)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  if (hr < 24) return `hace ${hr} h`
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  return formatDateLong(iso)
}

function initialsFromName(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function InfoTile({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Mail
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-border/40 bg-muted/15 px-4 py-3.5',
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm font-medium leading-snug text-foreground">{value}</div>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { refetch: refetchAuth, user: authUser } = useAuth()
  const { data: user, isLoading, isError, error: profileError } = useCurrentUser()
  const updateUser = useUpdateUser()
  const [editOpen, setEditOpen] = useState(false)
  const [telegramPending, setTelegramPending] = useState(false)
  const [telegramLink, setTelegramLink] = useState<string | null>(null)
  const [telegramStartCommand, setTelegramStartCommand] = useState<string | null>(null)

  const handleSaveProfile = async (input: { nombre: string; area: string | null }) => {
    if (!user) return
    await updateUser.mutateAsync({
      id: user.id,
      input: { nombre: input.nombre, area: input.area },
    })
    await refetchAuth()
  }

  const handleLinkTelegram = async () => {
    if (!user) return
    setTelegramPending(true)
    try {
      const token = await telegramIntegrationService.createLinkToken()
      const link = telegramIntegrationService.buildStartLink(token)
      setTelegramLink(link)
      setTelegramStartCommand(telegramIntegrationService.buildStartCommand(token))
      toast.success('Enlace de Telegram generado')
      window.open(link, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el enlace de Telegram.')
    } finally {
      setTelegramPending(false)
    }
  }

  const handleCopyTelegramCommand = async () => {
    if (!telegramStartCommand) return
    try {
      await navigator.clipboard.writeText(telegramStartCommand)
      toast.success('Comando copiado')
    } catch {
      toast.error('No se pudo copiar. Selecciona el comando manualmente.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Cargando tu perfil…
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm shadow-sm">
        <p className="font-medium text-destructive">No pudimos mostrar tu ficha en el tablero.</p>
        {isError && profileError instanceof Error ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{profileError.message}</p>
        ) : null}
        {!isError && !user ? (
          <p className="text-xs leading-relaxed text-foreground/90">
            Tu sesión está activa, pero aún no tienes ficha aquí. Pide a un administrador que revise tu alta en
            Usuarios.
          </p>
        ) : null}
      </div>
    )
  }

  const email = authUser?.email ?? '—'
  const areaLabel = user.area ?? 'Sin área'
  const lastAccess = formatRelativeAccess(authUser?.last_sign_in_at ?? null)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Encabezado */}
      <SectionCard>
        <SectionCardBody className="p-4 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-semibold text-primary sm:h-16 sm:w-16 sm:text-lg',
                  'bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15'
                )}
                aria-hidden
              >
                {initialsFromName(user.nombre)}
              </div>
              <div className="min-w-0 space-y-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {user.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-medium">
                    {user.rol}
                  </Badge>
                  <Badge variant="outline" className="font-medium text-muted-foreground">
                    {areaLabel}
                  </Badge>
                  <Badge variant={user.activo ? 'success' : 'muted'} className="font-medium">
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button className="h-10 w-full shrink-0 sm:w-auto" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar perfil
            </Button>
          </div>
        </SectionCardBody>
      </SectionCard>

      {/* Cuenta */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Tu cuenta</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile icon={Mail} label="Correo" value={<span className="break-all">{email}</span>} />
          <InfoTile icon={Building2} label="Área" value={areaLabel} />
          <InfoTile
            icon={Shield}
            label="Seguridad"
            value={
              <span className="text-muted-foreground">
                Nombre, área y contraseña desde{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setEditOpen(true)}
                >
                  Editar perfil
                </button>
              </span>
            }
            className="sm:col-span-2"
          />
          <InfoTile
            icon={MessageCircle}
            label="Telegram"
            value={
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full gap-1.5 sm:w-auto"
                    onClick={handleLinkTelegram}
                    disabled={telegramPending}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {telegramPending ? 'Generando...' : 'Vincular Telegram'}
                  </Button>
                  {telegramLink ? (
                    <Button asChild variant="ghost" size="sm" className="h-8 w-full gap-1.5 sm:w-auto">
                      <a href={telegramLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir bot
                      </a>
                    </Button>
                  ) : null}
                  {telegramStartCommand ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full gap-1.5 sm:w-auto"
                      onClick={handleCopyTelegramCommand}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar /start
                    </Button>
                  ) : null}
                </div>
                {telegramStartCommand ? (
                  <code className="block max-w-full select-all overflow-x-auto rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs text-muted-foreground">
                    {telegramStartCommand}
                  </code>
                ) : null}
              </div>
            }
            className="sm:col-span-2"
          />
          {lastAccess ? (
            <InfoTile icon={CalendarClock} label="Último acceso" value={lastAccess} className="sm:col-span-2" />
          ) : null}
        </div>
      </section>

      {/* Sistema */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Información del sistema</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile icon={ShieldCheck} label="Rol" value={user.rol} />
          <InfoTile icon={CalendarDays} label="Cuenta creada" value={formatDateLong(user.created_at)} />
          <InfoTile icon={MapPin} label="Última actualización" value={formatDateLong(user.updated_at)} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          El rol lo asigna un administrador. Puedes cambiar tu nombre, área y contraseña en cualquier momento.
        </p>
      </section>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onSaveProfile={handleSaveProfile}
        isSavingProfile={updateUser.isPending}
      />
    </div>
  )
}
