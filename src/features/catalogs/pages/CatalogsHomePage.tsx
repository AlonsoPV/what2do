import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants'

/** Redirige el hub de catálogos a Roles en Directorios. */
export function CatalogsHomePage() {
  return <Navigate to={ROUTES.DIRECTORIOS_ROLES} replace />
}
