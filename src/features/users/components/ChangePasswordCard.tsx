import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { cn } from '@/lib/utils'

export type ChangePasswordCardProps = {
  /** Último inicio de sesión (Supabase `user.last_sign_in_at`) para contexto de seguridad. */
  lastSignInAt?: string | null
  className?: string
}

function formatRelativeAccess(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60_000)
  const hr = Math.floor(min / 60)
  const days = Math.floor(hr / 24)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  if (hr < 24) return `hace ${hr} h`
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`
  return `hace ${Math.floor(days / 365)} años`
}

export function ChangePasswordCard({ lastSignInAt, className }: ChangePasswordCardProps) {
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

  const accessHint =
    lastSignInAt && !Number.isNaN(new Date(lastSignInAt).getTime())
      ? formatRelativeAccess(lastSignInAt)
      : null

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border border-border/40 bg-card/40 p-6 shadow-sm ring-1 ring-inset ring-black/[0.04] backdrop-blur-[2px] dark:bg-card/25 dark:ring-white/[0.06] sm:p-8',
          className
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2.5 text-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-base font-semibold tracking-tight sm:text-lg">Contraseña</h3>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Actualiza tu contraseña cuando quieras. Usa al menos {PASSWORD_MIN_LENGTH} caracteres; si puedes,
              combina letras y números.
            </p>
            {accessHint ? (
              <p className="text-xs text-muted-foreground">
                Último acceso a la cuenta: <span className="font-medium text-foreground/80">{accessHint}</span>
              </p>
            ) : null}
          </div>
          <Button size="default" className="h-10 w-full shrink-0 px-5 sm:w-auto" onClick={() => setOpen(true)}>
            Cambiar contraseña
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" aria-hidden />
              <DialogTitle className="text-left">Cambiar contraseña</DialogTitle>
            </div>
            <DialogDescription className="text-left text-sm leading-relaxed">
              Por seguridad, primero pedimos tu contraseña actual. La nueva queda solo en el acceso; no aparece en tu
              ficha del tablero.
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
