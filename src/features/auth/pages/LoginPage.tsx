/**
 * Pantalla de login.
 * Si el usuario ya está autenticado y tiene perfil válido, redirige al dashboard.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { APP_NAME, ROUTES } from '@/constants'
import { authService } from '@/services/auth.service'
import { useAuth } from '../hooks/useAuth'
import { LoginForm } from '../components/LoginForm'
import { AuthLoader } from '../components/AuthLoader'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { LoginFormValues } from '../schemas/login.schema'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    status,
    authLoading,
    sessionStatus,
    profileStatus,
    isAuthenticated,
    isReady,
    profile,
    error,
    logout,
  } = useAuth()

  const pendingLoginResolutionRef = useRef(false)
  const redirectAfterLogin = useMemo(() => {
    const from = location.state && typeof location.state === 'object' ? location.state.from : null
    const pathname = typeof from?.pathname === 'string' ? from.pathname : ''
    const search = typeof from?.search === 'string' ? from.search : ''
    const hash = typeof from?.hash === 'string' ? from.hash : ''
    return pathname.startsWith('/') && pathname !== ROUTES.LOGIN
      ? `${pathname}${search}${hash}`
      : ROUTES.DASHBOARD
  }, [location.state])

  useEffect(() => {
    if (!authLoading && isAuthenticated && isReady && profile?.activo) {
      navigate(redirectAfterLogin, { replace: true })
    }
  }, [authLoading, isAuthenticated, isReady, profile?.activo, navigate, redirectAfterLogin])

  useEffect(() => {
    if (!pendingLoginResolutionRef.current || authLoading) return

    if (sessionStatus !== 'authenticated') return

    if (profileStatus === 'loaded' && profile?.activo) {
      pendingLoginResolutionRef.current = false
      setLoginLoading(false)
      toast.success('Sesión iniciada', { closeButton: true })
      navigate(redirectAfterLogin, { replace: true })
      return
    }

    if (profileStatus === 'no_profile' || profileStatus === 'inactive') {
      pendingLoginResolutionRef.current = false
      setLoginLoading(false)
      setLoginError(error?.message ?? 'No pudimos completar tu acceso.')
      void logout()
      return
    }

    if (profileStatus === 'timeout' || profileStatus === 'network_error') {
      pendingLoginResolutionRef.current = false
      setLoginLoading(false)
      setLoginError(error?.message ?? 'No pudimos cargar tu perfil.')
    }
  }, [authLoading, sessionStatus, profileStatus, profile?.activo, error?.message, logout, navigate, redirectAfterLogin])

  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && status === 'signed_out' && error?.type === 'session_expired') {
      setLoginError(error.message)
    }
  }, [authLoading, status, error])

  const handleSubmit = async (values: LoginFormValues) => {
    setLoginError(null)
    setLoginLoading(true)
    try {
      await authService.signIn(values.email, values.password)
      pendingLoginResolutionRef.current = true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos iniciar sesión. Inténtalo de nuevo en un momento.'
      setLoginError(message)
      setLoginLoading(false)
    }
  }

  if (authLoading) {
    return <AuthLoader message="Comprobando tu sesión…" />
  }

  if (sessionStatus === 'authenticated' && (profileStatus === 'loading' || (isReady && profile?.activo))) {
    return <AuthLoader message={profileStatus === 'loading' ? 'Cargando tu perfil…' : 'Redirigiendo…'} />
  }

  return (
    <div className="login-page relative min-h-screen overflow-hidden bg-muted/40">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.12] via-transparent to-primary/[0.06]"
        aria-hidden
      />
      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,24rem)]">
        <aside
          className={cn(
            'relative hidden flex-col justify-between overflow-hidden px-10 py-12 text-primary-foreground lg:flex',
            'bg-gradient-to-br from-primary via-primary to-primary/85'
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23ffffff' fill-opacity='0.4' d='M0 16h32M16 0v32'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-inset ring-primary-foreground/20">
              <LayoutDashboard className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </div>
          <div className="relative max-w-md space-y-6">
            <p className="text-2xl font-semibold leading-snug tracking-tight text-primary-foreground sm:text-3xl">
              Operación clara, decisiones rápidas.
            </p>
            <p className="text-sm leading-relaxed text-primary-foreground/85">
              Tablero, KPIs, Kanban y disciplina en un solo lugar. Accede con tu cuenta corporativa.
            </p>
            <ul className="flex flex-col gap-3 text-sm text-primary-foreground/90">
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Acceso seguro y sesión protegida
              </li>
              <li className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Misma experiencia en equipo y en campo
              </li>
            </ul>
          </div>
          <p className="relative text-xs text-primary-foreground/55">© {new Date().getFullYear()} · Uso interno</p>
        </aside>

        <div
          role="main"
          className="flex flex-col items-center justify-center px-4 py-10 sm:px-8 lg:py-12"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">{APP_NAME}</span>
          </div>

          <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur-sm dark:shadow-black/20">
            <CardHeader className="space-y-1.5 pb-2 text-center sm:text-left">
              <CardTitle className="text-2xl font-semibold tracking-tight">Iniciar sesión</CardTitle>
              <CardDescription className="text-[15px] leading-relaxed">
                Introduce el correo y la contraseña de tu organización.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {loginError ? (
                <div
                  className="flex gap-3 rounded-xl border border-destructive/35 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p className="leading-snug">{loginError}</p>
                </div>
              ) : null}
              <LoginForm onSubmit={handleSubmit} isLoading={loginLoading} />
            </CardContent>
          </Card>
          <p className="mt-8 max-w-md text-center text-xs text-muted-foreground lg:max-w-sm">
            ¿Problemas para entrar? Contacta al administrador o usa recuperar contraseña en el formulario.
          </p>
        </div>
      </div>
    </div>
  )
}
