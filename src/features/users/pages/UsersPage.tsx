import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserFilters } from '../components/UserFilters'
import { UsersTable } from '../components/UsersTable'
import { UserForm } from '../components/UserForm'
import { useUsers, useCreateUser, useUpdateUser, useToggleUserStatus } from '../hooks'
import type { UserProfile, UsersFilter } from '../types/user.types'
import type { UserFormValues } from '../schemas/user.schema'
import type { UpdateUserInput } from '../types/user.types'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

const DEFAULT_FILTER: UsersFilter = {}

export function UsersPage() {
  const [filter, setFilter] = useState<UsersFilter>(DEFAULT_FILTER)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<UserProfile | null>(null)

  const { data: users = [], isLoading, isError, error } = useUsers(filter)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const toggleStatus = useToggleUserStatus()

  const handleClearFilters = useCallback(() => setFilter(DEFAULT_FILTER), [])

  const handleCreate = () => {
    setEditingUser(null)
    setFormOpen(true)
  }

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user)
    setFormOpen(true)
  }

  const handleFormSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateUser.mutate(
        { id: editingUser.id, input: values as UpdateUserInput },
        {
          onSuccess: () => {
            toast.success('Cambios guardados')
            setFormOpen(false)
            setEditingUser(null)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'No pudimos guardar los cambios. Inténtalo de nuevo.')
          },
        }
      )
    } else {
      const email = typeof values.email === 'string' ? values.email.trim() : ''
      if (!email) {
        toast.error('Indica un correo válido para enviar la invitación.')
        return
      }
      createUser.mutate(
        {
          email,
          nombre: values.nombre,
          rol: values.rol,
          area: values.area ?? null,
          activo: values.activo ?? true,
          onboarding_completed: values.onboarding_completed ?? false,
        },
        {
          onSuccess: () => {
            toast.success(
              `Invitación enviada a ${email}. Esa persona recibirá un correo para elegir contraseña y entrar.`
            )
            setFormOpen(false)
            setEditingUser(null)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'No pudimos enviar la invitación. Inténtalo de nuevo.')
          },
        }
      )
    }
  }

  const handleToggleStatus = (user: UserProfile) => setConfirmToggle(user)

  const confirmToggleStatus = () => {
    if (!confirmToggle) return
    const newActivo = !confirmToggle.activo
    toggleStatus.mutate(
      { id: confirmToggle.id, activo: newActivo },
      {
        onSuccess: () => {
          toast.success(
            newActivo
              ? 'Cuenta activada: ya puede entrar al tablero.'
              : 'Cuenta desactivada: no podrá entrar hasta que la reactives.'
          )
          setConfirmToggle(null)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'No pudimos cambiar el estado. Inténtalo de nuevo.')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">
            Invita personas por correo y gestiona su ficha en el tablero.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Invitar usuario
        </Button>
      </div>

      <UserFilters
        filter={filter}
        onFilterChange={setFilter}
        onClear={handleClearFilters}
      />

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'No pudimos cargar el listado. Revisa la conexión o inténtalo de nuevo.'}
        </div>
      )}

      <UsersTable
        users={users}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        isLoading={isLoading}
      />

      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar ficha' : 'Invitar a alguien nuevo'}</DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              {editingUser
                ? 'Los cambios aplican a su ficha en el tablero (rol, área y estado).'
                : 'Con correo, nombre y rol basta. Creamos el acceso y enviamos un correo para que elija contraseña.'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            key={editingUser ? editingUser.id : 'create-user'}
            defaultValues={
              editingUser
                ? {
                    nombre: editingUser.nombre,
                    rol: editingUser.rol,
                    area: editingUser.area ?? undefined,
                    activo: editingUser.activo,
                    onboarding_completed: editingUser.onboarding_completed,
                  }
                : undefined
            }
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
            isSubmitting={createUser.isPending || updateUser.isPending}
            isCreate={!editingUser}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmToggle} onOpenChange={() => setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.activo
                ? `¿Desactivar a ${confirmToggle.nombre}? No podrá entrar al tablero hasta que reactives su cuenta.`
                : `¿Activar a ${confirmToggle?.nombre}? Podrá volver a entrar con su correo y contraseña.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className={confirmToggle?.activo ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmToggle?.activo ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
