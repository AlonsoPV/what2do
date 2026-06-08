import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UserProfile } from '../types/user.types'
import { Pencil, UserCheck, UserX } from 'lucide-react'

function formatDate(iso: string) {
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

interface UserDetailCardProps {
  user: UserProfile
  email?: string | null
  onEdit: () => void
  onToggleStatus: () => void
  isToggling?: boolean
}

export function UserDetailCard({
  user,
  email,
  onEdit,
  onToggleStatus,
  isToggling = false,
}: UserDetailCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">{user.nombre}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            ID de perfil: <code className="text-xs bg-muted px-1 rounded">{user.id}</code>
          </p>
        </div>
        <div className="flex gap-2">
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
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Correo</dt>
            <dd className="mt-0.5 text-sm">{email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">user_id (Auth)</dt>
            <dd className="mt-0.5 text-sm font-mono break-all">{user.user_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Rol</dt>
            <dd className="mt-0.5">
              <Badge variant="secondary">{user.rol}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Área</dt>
            <dd className="mt-0.5 text-sm">{user.area ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Estatus</dt>
            <dd className="mt-0.5">
              <Badge variant={user.activo ? 'success' : 'muted'}>
                {user.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Creado</dt>
            <dd className="mt-0.5 text-sm">{formatDate(user.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Actualizado</dt>
            <dd className="mt-0.5 text-sm">{formatDate(user.updated_at)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
