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
const USER_FORM_ID = 'user-form-dialog'

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
        },
        {
          onSuccess: () => {
            toast.success(
              `Usuario creado y confirmado: ${email}. Puede iniciar sesion con la contrasena inicial configurada.`
            )
            setFilter(DEFAULT_FILTER)
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
          <p className="max-w-2xl text-muted-foreground">
            Gestiona acceso al tablero: correo, nombre, rol, área y estado. Para WhatsApp y envío de
            acciones, abre el detalle de cada usuario.
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
        <DialogContent className="flex max-h-[min(90dvh,720px)] w-[calc(100vw-2rem)] max-w-lg grid-rows-none flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-12 text-left">
            <DialogTitle>{editingUser ? 'Editar ficha' : 'Invitar a alguien nuevo'}</DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              {editingUser
                ? 'Los cambios aplican a su ficha en el tablero (rol, área y estado).'
                : 'Con correo, nombre y rol basta. Creamos el acceso confirmado y su ficha en el tablero.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <UserForm
              key={editingUser ? editingUser.id : 'create-user'}
              formId={USER_FORM_ID}
              hideActions
              defaultValues={
                editingUser
                  ? {
                      nombre: editingUser.nombre,
                      rol: editingUser.rol,
                      area: editingUser.area ?? undefined,
                      activo: editingUser.activo,
                    }
                  : undefined
              }
              onSubmit={handleFormSubmit}
              onCancel={() => setFormOpen(false)}
              isSubmitting={createUser.isPending || updateUser.isPending}
              isCreate={!editingUser}
            />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={createUser.isPending || updateUser.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={USER_FORM_ID}
              disabled={createUser.isPending || updateUser.isPending}
            >
              {createUser.isPending || updateUser.isPending
                ? 'Guardando…'
                : editingUser
                  ? 'Guardar cambios'
                  : 'Crear usuario'}
            </Button>
          </div>
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
