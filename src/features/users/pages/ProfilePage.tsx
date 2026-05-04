import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCurrentUser } from '../hooks'
import { useUpdateUser } from '../hooks'
import { ChangePasswordCard } from '../components/ChangePasswordCard'
import {
  CalendarClock,
  CalendarDays,
  Mail,
  Pencil,
  PartyPopper,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

function initialsFromName(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker?: string
  title: string
  description?: string
}) {
  return (
    <header className="space-y-1 px-0.5">
      {kicker ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kicker}</p>
      ) : null}
      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
      {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </header>
  )
}

const panelClass =
  'rounded-2xl border border-border/40 bg-card/40 p-6 shadow-sm ring-1 ring-inset ring-black/[0.04] backdrop-blur-[2px] dark:bg-card/25 dark:ring-white/[0.06] sm:p-8'

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground ring-1 ring-inset ring-black/5 dark:ring-white/10"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-base font-medium leading-snug tracking-tight text-foreground">{children}</div>
      </div>
    </div>
  )
}

function MetadataCell({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/30 bg-background/40 p-4 dark:bg-background/20">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { refetch: refetchAuth, user: authUser } = useAuth()
  const { data: user, isLoading, isError, error: profileError } = useCurrentUser()
  const updateUser = useUpdateUser()
  const [editOpen, setEditOpen] = useState(false)
  const [nombreEdit, setNombreEdit] = useState('')

  const handleOpenEdit = () => {
    if (user) {
      setNombreEdit(user.nombre)
      setEditOpen(true)
    }
  }

  const handleSaveNombre = () => {
    if (!user) return
    updateUser.mutate(
      { id: user.id, input: { nombre: nombreEdit.trim() } },
      {
        onSuccess: () => {
          toast.success('Perfil actualizado')
          setEditOpen(false)
          refetchAuth()
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'No pudimos guardar los cambios. Inténtalo de nuevo.')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Cargando tu perfil…</div>
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
        {isError ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Revisa tu conexión e inténtalo de nuevo. Si sigue igual, avisa a quien administra la plataforma.
          </p>
        ) : null}
      </div>
    )
  }

  const email = authUser?.email ?? '—'
  const areaLabel = user.area ?? 'Sin área'

  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-16 pt-1 lg:max-w-4xl">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cuenta</p>

      {/* Identidad */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex min-w-0 gap-4 sm:gap-5">
          <div
            className={cn(
              'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold tracking-tight text-primary sm:h-20 sm:w-20 sm:text-xl',
              'bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-inset ring-primary/10'
            )}
            aria-hidden
          >
            {initialsFromName(user.nombre)}
          </div>
          <div className="min-w-0 space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{user.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-medium">
                {user.rol}
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-background/50 font-medium text-muted-foreground">
                {areaLabel}
              </Badge>
            </div>
          </div>
        </div>
        <Button size="lg" className="h-11 w-full shrink-0 px-5 sm:w-auto" onClick={handleOpenEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar perfil
        </Button>
      </header>

      {/* Información personal */}
      <section className="space-y-4">
        <SectionHeader
          title="Información personal"
          description="Correo vinculado a tu acceso. El nombre que ves arriba lo actualizas con «Editar perfil»."
        />
        <div className={panelClass}>
          <div className="max-w-xl">
            <DetailRow icon={Mail} label="Correo electrónico">
              <span className="break-all">{email}</span>
            </DetailRow>
          </div>
        </div>
      </section>

      {/* Información del sistema */}
      <section className="space-y-4">
        <SectionHeader
          title="Información del sistema"
          description="Estado de tu cuenta y fechas administradas por la plataforma. El rol y el área solo los cambia un administrador."
        />
        <div className={panelClass}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetadataCell icon={ShieldCheck} label="Estatus">
              <Badge variant={user.activo ? 'success' : 'muted'} className="font-medium">
                {user.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </MetadataCell>
            <MetadataCell icon={PartyPopper} label="Registro de bienvenida">
              <Badge variant={user.onboarding_completed ? 'success' : 'outline'} className="font-medium">
                {user.onboarding_completed ? 'Completado' : 'Pendiente'}
              </Badge>
            </MetadataCell>
            <MetadataCell icon={CalendarDays} label="Cuenta creada">
              {formatDateLong(user.created_at)}
            </MetadataCell>
            <MetadataCell icon={CalendarClock} label="Última actualización">
              {formatDateLong(user.updated_at)}
            </MetadataCell>
          </div>
        </div>
      </section>

      {/* Seguridad */}
      <section className="space-y-4">
        <SectionHeader
          title="Seguridad"
          description="Tu contraseña protege el acceso. No compartas credenciales ni reutilices contraseñas de otros sitios."
        />
        <ChangePasswordCard lastSignInAt={authUser?.last_sign_in_at ?? null} />
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Actualiza cómo aparece tu nombre en el tablero. El rol y el área solo los modifica un administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="profile-nombre">Nombre para mostrar</Label>
              <Input
                id="profile-nombre"
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateUser.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNombre}
                disabled={
                  !nombreEdit.trim() ||
                  nombreEdit.trim().length < 2 ||
                  nombreEdit.trim() === user.nombre ||
                  updateUser.isPending
                }
              >
                {updateUser.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
