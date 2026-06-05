import type { Notificacion } from '@/types'

export type NotificacionPayloadView = {
  titulo?: string
  mensaje?: string
  accion_id?: string
  ticket_id?: string
  ticket_titulo?: string
  ticket_status?: string
  titulo_accion?: string
  descripcion_accion?: string
  creador_id?: string | null
  creador_nombre?: string | null
  asignador_id?: string | null
  asignador_nombre?: string | null
  autor_id?: string | null
  autor_nombre?: string | null
}

export type AccionMetaDisplay = {
  titulo_accion?: string | null
  descripcion_accion?: string | null
  creador_nombre?: string | null
}

export function parseNotificacionPayload(payload: Record<string, unknown> | null): NotificacionPayloadView {
  if (!payload || typeof payload !== 'object') return {}
  const p = payload as NotificacionPayloadView
  return {
    titulo: typeof p.titulo === 'string' ? p.titulo : undefined,
    mensaje: typeof p.mensaje === 'string' ? p.mensaje : undefined,
    accion_id: typeof p.accion_id === 'string' ? p.accion_id : undefined,
    ticket_id: typeof p.ticket_id === 'string' ? p.ticket_id : undefined,
    ticket_titulo: typeof p.ticket_titulo === 'string' ? p.ticket_titulo : undefined,
    ticket_status: typeof p.ticket_status === 'string' ? p.ticket_status : undefined,
    titulo_accion: typeof p.titulo_accion === 'string' ? p.titulo_accion : undefined,
    descripcion_accion: typeof p.descripcion_accion === 'string' ? p.descripcion_accion : undefined,
    creador_id: p.creador_id ?? null,
    creador_nombre: typeof p.creador_nombre === 'string' ? p.creador_nombre : null,
    asignador_id: p.asignador_id ?? null,
    asignador_nombre: typeof p.asignador_nombre === 'string' ? p.asignador_nombre : null,
    autor_id: p.autor_id ?? null,
    autor_nombre: typeof p.autor_nombre === 'string' ? p.autor_nombre : null,
  }
}

/** Evento que disparó la notificación (asignación, comentario). */
export function notificacionEventoLabel(tipo: string, payload: NotificacionPayloadView): string | null {
  if (tipo === 'responsable') {
    const name = payload.asignador_nombre?.trim()
    return name ? `Te asignó: ${name}` : null
  }
  if (tipo === 'comentario' || tipo === 'comentario_asignado') {
    const name = payload.autor_nombre?.trim()
    return name ? `Comentó: ${name}` : null
  }
  return null
}

export function accionIdsFromNotificaciones(notifications: Notificacion[]): string[] {
  const ids = new Set<string>()
  for (const n of notifications) {
    const p = parseNotificacionPayload(n.payload as Record<string, unknown> | null)
    if (p.accion_id) ids.add(p.accion_id)
  }
  return [...ids]
}

export function resolveAccionTitulo(
  payload: NotificacionPayloadView,
  accionMeta?: AccionMetaDisplay
): string | null {
  const fromPayload = payload.titulo_accion?.trim()
  if (fromPayload) return fromPayload
  const fromDb = accionMeta?.titulo_accion?.trim()
  if (fromDb) return fromDb
  return null
}

export function resolveAccionDescripcion(
  payload: NotificacionPayloadView,
  accionMeta?: AccionMetaDisplay
): string | null {
  const fromPayload = payload.descripcion_accion?.trim()
  if (fromPayload) return fromPayload
  const fromDb = accionMeta?.descripcion_accion?.trim()
  if (fromDb) return fromDb
  return null
}

export function resolveCreadorNombre(
  payload: NotificacionPayloadView,
  accionMeta?: AccionMetaDisplay
): string | null {
  const fromPayload = payload.creador_nombre?.trim()
  if (fromPayload) return fromPayload
  const fromDb = accionMeta?.creador_nombre?.trim()
  if (fromDb) return fromDb
  return null
}

/** Texto del comentario (distinto de la descripción de la acción). */
export function resolveComentarioPreview(tipo: string, mensaje?: string): string | null {
  if (tipo !== 'comentario' && tipo !== 'comentario_asignado') return null
  const text = mensaje?.trim()
  return text || null
}
