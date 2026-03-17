/**
 * Solicitar enlace para restablecer contraseña.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME, ROUTES } from '@/constants'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Escribe tu email')
      return
    }
    setLoading(true)
    try {
      const baseUrl = import.meta.env.VITE_APP_URL ?? window.location.origin
      const redirectTo = `${baseUrl.replace(/\/$/, '')}${ROUTES.RESET_PASSWORD}`
      await authService.resetPasswordForEmail(trimmed, redirectTo)
      setSent(true)
      toast.success('Revisa tu correo')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar el enlace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            {sent
              ? 'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.'
              : `Escribe el email de tu cuenta de ${APP_NAME} y te enviamos un enlace.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to={ROUTES.LOGIN}>Volver al inicio de sesión</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to={ROUTES.LOGIN}>Volver al inicio de sesión</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
