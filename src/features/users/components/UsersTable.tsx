import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserProfile } from '../types/user.types'
import { MoreHorizontal, Pencil, Eye, UserCheck, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
interface UsersTableProps {
  users: UserProfile[]
  onEdit: (user: UserProfile) => void
  onToggleStatus: (user: UserProfile) => void
  isLoading?: boolean
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function UsersTable({
  users,
  onEdit,
  onToggleStatus,
  isLoading,
}: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-card">
        <div className="flex h-[320px] items-center justify-center text-muted-foreground">
          Cargando listado…
        </div>
      </div>
    )
  }

  if (!users.length) {
    return (
      <div className="rounded-md border bg-card">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-muted-foreground">No hay usuarios que coincidan con los filtros.</p>
          <p className="text-sm text-muted-foreground">
            Prueba ajustar los criterios o agrega el primer usuario.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead>Onboarding</TableHead>
            <TableHead>Fecha alta</TableHead>
            <TableHead className="w-[70px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.nombre}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.rol}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.area ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={user.activo ? 'success' : 'muted'}>
                  {user.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.onboarding_completed ? 'success' : 'outline'}>
                  {user.onboarding_completed ? 'Completado' : 'Pendiente'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(user.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/settings/users/${user.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalle
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onToggleStatus(user)}
                      className={cn(!user.activo && 'text-emerald-600')}
                    >
                      {user.activo ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
