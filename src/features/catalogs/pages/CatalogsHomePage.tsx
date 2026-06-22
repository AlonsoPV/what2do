import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants'

/** Redirige el hub de catálogos a Roles; solo Usuarios y Roles están activos en configuración. */
export function CatalogsHomePage() {
  return <Navigate to={ROUTES.SETTINGS_CATALOGS_ROLES} replace />
}
