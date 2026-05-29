import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calendarRemindersService } from '@/services/calendarReminders.service'
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

export function useDueCalendarReminderNotifications(usuarioId: string | undefined) {
  const qc = useQueryClient()
  const dueRemindersQuery = useQuery({
    queryKey: ['calendar-reminders-due', usuarioId ?? ''],
    queryFn: () => calendarRemindersService.listDuePending(usuarioId!, new Date().toISOString()),
    enabled: Boolean(usuarioId),
    refetchInterval: 60_000,
    staleTime: 0,
  })

  useEffect(() => {
    if (!usuarioId || !dueRemindersQuery.data?.length) return
    let cancelled = false
    const targetUsuarioId = usuarioId
    async function notifyDueReminders() {
      for (const reminder of dueRemindersQuery.data ?? []) {
        if (cancelled) return
        await notificacionesService.create({
          usuario_id: targetUsuarioId,
          tipo: 'recordatorio_calendario',
          prioridad: 'Alta',
          payload: {
            titulo: `Recordatorio: ${reminder.titulo}`,
            mensaje: reminder.descripcion,
            reminder_id: reminder.id,
            fecha_limite: reminder.fecha_limite,
          },
        })
        await calendarRemindersService.markNotified(reminder.id)
      }
      void qc.invalidateQueries({ queryKey: ['calendar-reminders'] })
      void qc.invalidateQueries({ queryKey: KEY })
    }
    notifyDueReminders().catch((error) => {
      console.error('[calendar-reminders] due notification:', error)
    })
    return () => {
      cancelled = true
    }
  }, [dueRemindersQuery.data, qc, usuarioId])
}
