/**
 * Protege rutas que requieren autenticación.
 * - Bootstrap (authLoading): solo loader; nunca redirige.
 * - Sin sesión: redirige a login cuando el bootstrap ya terminó.
 * - Error de perfil (no_profile / user_inactive): pantalla específica; no redirige por sesión.
 * - Error de red: pantalla Reintentar; no se asume sesión inválida.
 */

import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAppStore } from '@/store'
import { AuthLoader } from '@/features/auth/components/AuthLoader'
import { Button } from '@/components/ui/button'

export function ProtectedRoute() {
  const navigate = useNavigate()
  const resetOnLogout = useAppStore((s) => s.resetOnLogout)
  const {
    status,
    isLoading: authLoading,
    isAuthenticated,
    error,
    logout,
    refetch,
  } = useAuth()

  if (authLoading || status === 'loading') {
    return <AuthLoader />
  }

  const isProfileError = isAuthenticated && error && (error.type === 'no_profile' || error.type === 'user_inactive')
  if (isProfileError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {error!.type === 'user_inactive' ? 'Cuenta desactivada' : 'Ficha pendiente en el tablero'}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{error!.message}</p>
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

  if (error?.type === 'network') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="max-w-md rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-center">
          <h2 className="mb-2 font-semibold text-amber-700 dark:text-amber-400">
            Sin conexión o el servicio no respondió
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <Outlet />
}
