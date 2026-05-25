import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthLoader } from '@/features/auth/components/AuthLoader'
import { hasPlanAccionAccess } from '../lib/planAccionAccess'
import { PlanAccionPage } from './PlanAccionPage'

/** Ruta protegida: solo la fila autorizada en `usuarios.id`. */
export function PlanAccionRoute() {
  const { profile, authLoading, profileStatus } = useAuth()

  if (authLoading || profileStatus === 'loading') {
    return <AuthLoader message="Comprobando acceso…" />
  }

  if (!hasPlanAccionAccess(profile)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <PlanAccionPage />
}
