import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAdminService } from '../services/users.service'
import type { CreateUserInput } from '../types/user.types'
import { usersQueryKey } from './useUsers'

/**
 * Invitar usuario por correo. La Edge Function crea el acceso en Auth y
 * el trigger sincroniza el perfil en la tabla usuarios.
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateUserInput) => usersAdminService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
      await queryClient.refetchQueries({ queryKey: usersQueryKey, type: 'active' })
    },
  })
}
