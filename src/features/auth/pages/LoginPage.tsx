/**
 * Pantalla de login.
 * Si el usuario ya está autenticado y tiene perfil válido, redirige al dashboard.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { APP_NAME, ROUTES } from '@/constants'
import { authService } from '@/services/auth.service'
import { useAuth } from '../hooks/useAuth'
import { LoginForm } from '../components/LoginForm'
import { AuthLoader } from '../components/AuthLoader'
import { toast } from 'sonner'
import type { LoginFormValues } from '../schemas/login.schema'

export function LoginPage() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    isReady,
    isLoading: authLoading,
    profile,
    refetch,
    logout,
  } = useAuth()

  useEffect(() => {
    if (!authLoading && isAuthenticated && isReady && profile?.activo) {
      navigate(ROUTES.DASHBOARD, { replace: true })
    }
  }, [authLoading, isAuthenticated, isReady, profile?.activo, navigate])

  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleSubmit = async (values: LoginFormValues) => {
    setLoginError(null)
    setLoginLoading(true)
    try {
      await authService.signIn(values.email, values.password)
      const result = await refetch('SIGNED_IN')

      if (result.canEnterApp) {
        toast.success('Sesión iniciada')
        navigate(ROUTES.DASHBOARD, { replace: true })
        return
      }

      if (result.error?.type === 'no_profile' || result.error?.type === 'user_inactive') {
        setLoginError(result.error.message)
        await logout()
        return
      }

      if (result.error?.type === 'network') {
        setLoginError(result.error.message)
        return
      }

      // Estado raro tras signIn (p. ej. sesión aún no visible): no forzar signOut; el usuario puede reintentar.
      setLoginError(
        'No pudimos completar el acceso. Prueba de nuevo; si sigue igual, entra desde otro navegador o dispositivo.'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos iniciar sesión. Inténtalo de nuevo en un momento.'
      setLoginError(message)
    } finally {
      setLoginLoading(false)
    }
  }

  if (authLoading) {
    return <AuthLoader />
  }

  if (isAuthenticated && isReady && profile?.activo) {
    return <AuthLoader />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-muted/50 to-muted/30 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-2 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">{APP_NAME}</CardTitle>
          <CardDescription className="text-base">
            Usa el correo y la contraseña que te dieron para esta plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginError && (
            <div
              className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="leading-snug">{loginError}</p>
            </div>
          )}
          <LoginForm onSubmit={handleSubmit} isLoading={loginLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
