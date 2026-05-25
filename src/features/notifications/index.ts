/**
 * Feature: Notificaciones (spec §5.9)
 * Centro de notificaciones: tiempo real, filtro por tipo/prioridad,
 * leído/no leído.
 */

export { NotificationCenter } from './components/NotificationCenter'
export { NotificationHeaderButton } from './components/NotificationHeaderButton'
export { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from './hooks/useNotifications'
