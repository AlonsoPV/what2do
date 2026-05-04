/**
 * Formulario de inicio de sesión con validación.
 */

import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { loginFormSchema, type LoginFormValues } from '../schemas/login.schema'
import { ROUTES } from '@/constants'

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
  isLoading?: boolean
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      email: values.email.trim(),
      password: values.password,
    })
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login-email">Correo</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          disabled={isLoading}
          {...form.register('email')}
          className={cn(
            'h-11 rounded-lg text-base sm:text-sm',
            form.formState.errors.email && 'border-destructive'
          )}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="login-password">Contraseña</Label>
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isLoading}
          {...form.register('password')}
          className={cn(
            'h-11 rounded-lg text-base sm:text-sm',
            form.formState.errors.password && 'border-destructive'
          )}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="h-11 w-full rounded-lg text-base font-semibold shadow-md transition-shadow hover:shadow-lg"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Iniciando sesión…
          </>
        ) : (
          'Iniciar sesión'
        )}
      </Button>
    </form>
  )
}
