import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usuariosService } from '@/services/usuarios.service'

const QUERY_KEY = ['users', 'current'] as const

/**
 * Perfil del usuario autenticado (tabla `usuarios`).
 * Usa el mismo `user.id` que `AuthContext` para evitar doble suscripción a sesión.
 */
export function useCurrentUser() {
  const { user, profile, status, isAuthenticated } = useAuth()
  const authUserId = user?.id ?? null
  const currentProfile = profile && profile.user_id === authUserId ? profile : null

  return useQuery({
    queryKey: [...QUERY_KEY, authUserId],
    queryFn: () => usuariosService.getByAuthId(authUserId!),
    enabled: Boolean(authUserId && isAuthenticated && status === 'authenticated' && !currentProfile),
    initialData: currentProfile ?? undefined,
    staleTime: currentProfile ? Infinity : 60 * 1000,
  })
}
