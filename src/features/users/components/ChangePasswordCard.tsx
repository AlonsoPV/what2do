import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { KeyRound, Shield } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'
import {
  PASSWORD_MIN_LENGTH,
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/password.schema'

export function ChangePasswordCard() {
  const [open, setOpen] = useState(false)

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset()
    }
    setOpen(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await authService.changePassword(values.currentPassword, values.newPassword)
      toast.success('Contraseña actualizada. La próxima vez usa la nueva.')
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos cambiar la contraseña. Inténtalo de nuevo.')
    }
  })

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5 text-primary" aria-hidden />
                Contraseña
              </CardTitle>
              <CardDescription>
                Cambia tu contraseña de acceso cuando quieras. Mínimo {PASSWORD_MIN_LENGTH} caracteres; si
                puedes, combina letras y números.
              </CardDescription>
            </div>
            <Button variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
              Cambiar contraseña
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" aria-hidden />
              <DialogTitle className="text-left">Cambiar contraseña</DialogTitle>
            </div>
            <DialogDescription className="text-left text-sm leading-relaxed">
              Por seguridad, primero pedimos tu contraseña actual. La nueva queda solo en el acceso; no
              aparece en tu ficha del tablero.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña actual"
                disabled={form.formState.isSubmitting}
                {...form.register('currentPassword')}
                className={form.formState.errors.currentPassword ? 'border-destructive' : ''}
              />
              {form.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Nueva contraseña"
                disabled={form.formState.isSubmitting}
                {...form.register('newPassword')}
                className={form.formState.errors.newPassword ? 'border-destructive' : ''}
              />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                disabled={form.formState.isSubmitting}
                {...form.register('confirmPassword')}
                className={form.formState.errors.confirmPassword ? 'border-destructive' : ''}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Guardar nueva contraseña'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
