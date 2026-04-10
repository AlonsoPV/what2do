/**
 * Solicitar enlace para restablecer contraseña.
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME, ROUTES } from '@/constants'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailValues,
} from '../schemas/password.schema'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const [sent, setSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState<string | null>(null)

  const form = useForm<ForgotPasswordEmailValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: '' },
  })

  const emailFromUrl = searchParams.get('email')
  useEffect(() => {
    if (emailFromUrl?.trim()) {
      form.setValue('email', emailFromUrl.trim())
    }
  }, [emailFromUrl, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    const email = values.email.trim()
    try {
      const baseUrl = import.meta.env.VITE_APP_URL ?? window.location.origin
      const redirectTo = `${baseUrl.replace(/\/$/, '')}${ROUTES.RESET_PASSWORD}`
      await authService.resetPasswordForEmail(email, redirectTo)
      setSentToEmail(email)
      setSent(true)
      toast.success('Si ese correo está registrado, te enviamos un enlace en unos minutos')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos enviar el enlace. Inténtalo de nuevo.')
    }
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-muted/50 to-muted/30 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {sent ? (
              <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />
            ) : (
              <Mail className="h-6 w-6 text-primary" aria-hidden />
            )}
          </div>
          <CardTitle className="text-2xl font-semibold">
            {sent ? 'Revisa tu correo' : '¿Olvidaste tu contraseña?'}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {sent ? (
              <>
                Si hay una cuenta con ese correo en {APP_NAME}, te llegará un mensaje con un enlace
                seguro. Caduca al poco tiempo; si no lo ves, mira en spam o promociones.
              </>
            ) : (
              <>
                Escribe el correo con el que te dieron de alta. Te enviaremos un enlace para elegir una
                contraseña nueva. No lo reenvíes: es solo para ti.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="space-y-4">
              {sentToEmail ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">
                  Enviado a: <span className="font-medium text-foreground">{sentToEmail}</span>
                </p>
              ) : null}
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Abre el correo desde este dispositivo, si puedes.</li>
                <li>Pulsa el enlace del correo; volverás aquí para escribir tu nueva contraseña.</li>
                <li>Luego inicia sesión con el correo y la contraseña nueva.</li>
              </ol>
              <Button asChild className="w-full" size="lg">
                <Link to={ROUTES.LOGIN} replace>
                  Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Correo</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  disabled={form.formState.isSubmitting}
                  {...form.register('email')}
                  className={form.formState.errors.email ? 'border-destructive' : ''}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando…' : 'Enviar enlace'}
              </Button>
              <Button asChild variant="ghost" className="w-full gap-2">
                <Link to={ROUTES.LOGIN}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Volver al inicio de sesión
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
