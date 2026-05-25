/**
 * Protege rutas que requieren autenticación.
 * - `authLoading`: solo loader mientras se resuelve la sesión.
 * - `sessionStatus`: decide si hay redirección a login.
 * - `profileStatus`: decide loader, error visible o acceso final.
 */

import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { canAccessRouteByRole, getDefaultRouteByRole } from '@/features/auth/lib/permissions'
import { useAppStore } from '@/store'
import { AuthLoader } from '@/features/auth/components/AuthLoader'
import { Button } from '@/components/ui/button'

export function ProtectedRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const resetOnLogout = useAppStore((s) => s.resetOnLogout)
  const {
    authLoading,
    sessionStatus,
    profileStatus,
    isAuthenticated,
    profile,
    error,
    logout,
    refetch,
  } = useAuth()

  useEffect(() => {
    if (authLoading || sessionStatus !== 'signed_out' || error?.type === 'network') return
    if (import.meta.env.DEV) {
      console.log('[auth] redirecting to login')
    }
  }, [authLoading, sessionStatus, error?.type])

  if (authLoading || sessionStatus === 'loading') {
    return <AuthLoader message="Comprobando tu sesión…" />
  }

  if (error?.type === 'network' && sessionStatus === 'signed_out') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="max-w-md rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-center">
          <h2 className="mb-2 font-semibold text-amber-700 dark:text-amber-400">
            No pudimos validar tu sesión
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'signed_out') {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (profileStatus === 'loading') {
    return <AuthLoader message="Cargando tu perfil…" />
  }

  if (profileStatus === 'timeout' || profileStatus === 'network_error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="max-w-md rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-center">
          <h2 className="mb-2 font-semibold text-amber-700 dark:text-amber-400">
            No pudimos cargar tu perfil
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {error?.message ?? 'Pudimos validar tu sesión, pero no fue posible cargar tu perfil. Intenta nuevamente.'}
          </p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const isProfileAccessError =
    isAuthenticated &&
    error &&
    (profileStatus === 'no_profile' || profileStatus === 'inactive')

  if (isProfileAccessError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {profileStatus === 'inactive' ? 'Cuenta desactivada' : 'Ficha pendiente en el tablero'}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{error.message}</p>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              resetOnLogout()
              void logout().then(() => navigate(ROUTES.LOGIN))
            }}
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    )
  }

  if (profileStatus === 'loaded' && !canAccessRouteByRole(profile?.rol, location.pathname)) {
    return <Navigate to={getDefaultRouteByRole(profile?.rol)} replace />
  }

  return <Outlet />
}
