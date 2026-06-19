import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
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
import { UserDetailCard } from '../components/UserDetailCard'
import { PasswordManagementCard } from '../components/PasswordManagementCard'
import { UserForm } from '../components/UserForm'
import { useCurrentUser, useUser, useUserAuthEmail, useUpdateUser, useToggleUserStatus } from '../hooks'
import type { UserFormValues } from '../schemas/user.schema'
import type { UpdateUserInput } from '../types/user.types'
import { isSuperAdminByRole } from '@/features/auth/lib/permissions'
import { telegramIntegrationService } from '@/services/telegramIntegration.service'
import { toast } from 'sonner'
import { ArrowLeft, MessageCircle } from 'lucide-react'

const USER_FORM_ID = 'user-detail-form'

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramUserId, setTelegramUserId] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [telegramSaving, setTelegramSaving] = useState(false)

  const { data: currentUser } = useCurrentUser()
  const { data: user, isLoading, isError, error } = useUser(id)
  const { data: email } = useUserAuthEmail(user?.user_id)
  const updateUser = useUpdateUser()
  const toggleStatus = useToggleUserStatus()
  const canAdminTelegram = isSuperAdminByRole(currentUser?.rol)
  const telegramIdentityQueryKey = ['telegram-identity', id]
  const { data: telegramIdentity } = useQuery({
    queryKey: telegramIdentityQueryKey,
    queryFn: () => telegramIntegrationService.getIdentity(id as string),
    enabled: !!id && canAdminTelegram,
  })

  useEffect(() => {
    if (!telegramIdentity) return
    setTelegramChatId(telegramIdentity.external_chat_id ?? '')
    setTelegramUserId(telegramIdentity.external_user_id ?? '')
    setTelegramUsername(telegramIdentity.external_username ?? '')
  }, [telegramIdentity])

  const handleFormSubmit = (values: UserFormValues) => {
    if (!id) return
    updateUser.mutate(
      { id, input: values as UpdateUserInput },
      {
        onSuccess: () => {
          toast.success('Usuario actualizado correctamente')
          setFormOpen(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Error al actualizar')
        },
      }
    )
  }

  const handleConfirmToggle = () => {
    if (!user) return
    toggleStatus.mutate(
      { id: user.id, activo: !user.activo },
      {
        onSuccess: () => {
          toast.success(user.activo ? 'Usuario desactivado' : 'Usuario activado')
          setConfirmToggle(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Error al cambiar estatus')
        },
      }
    )
  }

  const handleSaveTelegram = async () => {
    if (!user || !canAdminTelegram) return
    if (!telegramChatId.trim()) {
      toast.error('Captura el chat_id de Telegram.')
      return
    }

    setTelegramSaving(true)
    try {
      await telegramIntegrationService.adminUpsertIdentity({
        usuarioId: user.id,
        externalChatId: telegramChatId,
        externalUserId: telegramUserId,
        externalUsername: telegramUsername,
        displayName: user.nombre,
      })
      await qc.invalidateQueries({ queryKey: telegramIdentityQueryKey })
      toast.success('Telegram activado para el usuario')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo activar Telegram.')
    } finally {
      setTelegramSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Cargando usuario...
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings/users')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al listado
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Usuario no encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings/users')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al listado
        </Button>
      </div>

      <UserDetailCard
        user={user}
        email={email ?? null}
        onEdit={() => setFormOpen(true)}
        onToggleStatus={() => setConfirmToggle(true)}
        isToggling={toggleStatus.isPending}
      />

      <PasswordManagementCard userEmail={email ?? null} />

      {canAdminTelegram ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="telegram-chat-id">chat_id *</Label>
                <Input
                  id="telegram-chat-id"
                  value={telegramChatId}
                  onChange={(event) => setTelegramChatId(event.target.value)}
                  placeholder="Ej. 123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telegram-user-id">telegram_user_id</Label>
                <Input
                  id="telegram-user-id"
                  value={telegramUserId}
                  onChange={(event) => setTelegramUserId(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="telegram-username">Username</Label>
                <Input
                  id="telegram-username"
                  value={telegramUsername}
                  onChange={(event) => setTelegramUsername(event.target.value)}
                  placeholder="@usuario opcional"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={handleSaveTelegram} disabled={telegramSaving}>
                  {telegramSaving ? 'Guardando...' : 'Activar Telegram'}
                </Button>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              El usuario debe haber abierto el bot al menos una vez para que Telegram permita enviarle mensajes.
            </p>
            {telegramIdentity ? (
              <p className="text-xs text-muted-foreground">
                Estado actual: <span className="font-medium text-foreground">{telegramIdentity.status}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[min(90dvh,720px)] w-[calc(100vw-2rem)] max-w-lg grid-rows-none flex-col overflow-hidden p-0 gap-0"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-12 text-left">
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <UserForm
              key={`edit-user-${user.id}`}
              formId={USER_FORM_ID}
              hideActions
              defaultValues={{
                nombre: user.nombre,
                rol: user.rol,
                area: user.area ?? undefined,
                activo: user.activo,
              }}
              onSubmit={handleFormSubmit}
              onCancel={() => setFormOpen(false)}
              isSubmitting={updateUser.isPending}
              isCreate={false}
            />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={updateUser.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" form={USER_FORM_ID} disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmToggle} onOpenChange={setConfirmToggle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.activo ? 'Desactivar usuario' : 'Activar usuario'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.activo
                ? `¿Desactivar a ${user.nombre}? El usuario no podrá acceder hasta que se reactive.`
                : `¿Activar a ${user.nombre}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              className={user.activo ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {user.activo ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

