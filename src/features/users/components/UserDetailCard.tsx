import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UserProfile } from '../types/user.types'
import { KeyRound, Pencil, UserCheck, UserX } from 'lucide-react'
import { ROUTES } from '@/constants'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

interface UserDetailCardProps {
  user: UserProfile
  email?: string | null
  whatsappSummary?: string | null
  whatsappSection?: ReactNode
  onEdit: () => void
  onToggleStatus: () => void
  isToggling?: boolean
}

export function UserDetailCard({
  user,
  email,
  whatsappSummary,
  whatsappSection,
  onEdit,
  onToggleStatus,
  isToggling = false,
}: UserDetailCardProps) {
  const forgotHref =
    email?.trim()
      ? `${ROUTES.FORGOT_PASSWORD}?email=${encodeURIComponent(email.trim())}`
      : ROUTES.FORGOT_PASSWORD

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{user.nombre}</CardTitle>
            <Badge variant={user.activo ? 'success' : 'muted'}>
              {user.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            {whatsappSummary != null ? (
              <Badge variant={whatsappSummary === 'Sin vincular' ? 'secondary' : 'outline'}>
                WhatsApp: {whatsappSummary}
              </Badge>
            ) : null}
          </div>
          <CardDescription className="text-sm">
            {email ?? 'Sin correo'} · {user.rol}
            {user.area ? ` · ${user.area}` : ''}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant={user.activo ? 'outline' : 'default'}
            size="sm"
            onClick={onToggleStatus}
            disabled={isToggling}
          >
            {user.activo ? (
              <>
                <UserX className="mr-1 h-4 w-4" />
                Desactivar
              </>
            ) : (
              <>
                <UserCheck className="mr-1 h-4 w-4" />
                Activar
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Correo</dt>
            <dd className="mt-1 text-sm break-all">{email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rol</dt>
            <dd className="mt-1 text-sm">{user.rol}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Área</dt>
            <dd className="mt-1 text-sm">{user.area ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alta</dt>
            <dd className="mt-1 text-sm">{formatDate(user.created_at)}</dd>
          </div>
        </dl>

        {whatsappSection}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Restablecer contraseña por correo de recuperación.</span>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={forgotHref} target="_blank" rel="noopener noreferrer">
              Enviar recuperación
            </Link>
          </Button>
        </div>

        <details className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">IDs técnicos</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <p>
              <span className="font-medium">Perfil:</span>{' '}
              <code className="break-all">{user.id}</code>
            </p>
            <p>
              <span className="font-medium">Auth:</span>{' '}
              <code className="break-all">{user.user_id}</code>
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
