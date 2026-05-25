import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificacionesService } from '@/services/notificaciones.service'

const KEY = ['notificaciones'] as const

export function useNotifications(usuarioId: string | undefined, options?: { leido?: boolean; subscribe?: boolean }) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!usuarioId || options?.subscribe === false) return
    const sub = notificacionesService.subscribe(usuarioId, () => {
      qc.invalidateQueries({ queryKey: KEY })
    })
    return () => {
      sub.unsubscribe()
    }
  }, [qc, options?.subscribe, usuarioId])

  return useQuery({
    queryKey: [...KEY, usuarioId, options?.leido],
    queryFn: () => notificacionesService.listByUsuario(usuarioId!, options),
    enabled: !!usuarioId,
    staleTime: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificacionesService.markAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMarkAllNotificationsRead(usuarioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificacionesService.markAllAsRead(usuarioId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
