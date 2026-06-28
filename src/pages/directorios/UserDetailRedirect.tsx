import { Navigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'

/** Redirige enlaces legacy `/settings/users/:id` al módulo Directorios. */
export function UserDetailRedirect() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to={ROUTES.DIRECTORIOS_USUARIOS} replace />
  return <Navigate to={`/directorios/usuarios/${id}`} replace />
}
