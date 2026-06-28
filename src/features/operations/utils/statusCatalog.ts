import type { ActionStatus } from '@/types'
import type { Status } from '@/features/catalogs/types/catalogs.types'
import { accionEstadoLabel } from './accionEstadoDisplay'

const STATUS_KEYS: ActionStatus[] = ['En_Pausa', 'En_Proceso', 'Completada', 'Retrasa']

export function getStatusCatalogKey(status: Status): ActionStatus | null {
  const key = status.estado_key ?? status.nombre
  return STATUS_KEYS.includes(key as ActionStatus) ? (key as ActionStatus) : null
}

export function statusCatalogByKey(statuses: Status[]): Partial<Record<ActionStatus, Status>> {
  const map: Partial<Record<ActionStatus, Status>> = {}
  for (const status of statuses) {
    const key = getStatusCatalogKey(status)
    if (key) map[key] = status
  }
  return map
}

export function statusCatalogLabel(status: ActionStatus, map: Partial<Record<ActionStatus, Status>>): string {
  return map[status]?.nombre || accionEstadoLabel(status)
}

export function statusCatalogDescription(
  status: ActionStatus,
  map: Partial<Record<ActionStatus, Status>>,
  fallback: string
): string {
  return map[status]?.descripcion || fallback
}

export function statusCatalogColor(status: ActionStatus, map: Partial<Record<ActionStatus, Status>>): string | null {
  return map[status]?.color ?? null
}

export function orderedActionStatuses(statuses: Status[], fallbackOrder: ActionStatus[]): ActionStatus[] {
  const indexed = new Map(fallbackOrder.map((status, index) => [status, index]))
  const activeCatalogStatuses = statuses
    .map((status) => ({ key: getStatusCatalogKey(status), status }))
    .filter((item): item is { key: ActionStatus; status: Status } => !!item.key && item.status.activo)

  const ordered = activeCatalogStatuses
    .sort((a, b) => a.status.orden - b.status.orden || (indexed.get(a.key) ?? 99) - (indexed.get(b.key) ?? 99))
    .map((item) => item.key)

  for (const status of fallbackOrder) {
    if (!ordered.includes(status)) ordered.push(status)
  }

  return ordered
}

export function hexToRgba(hex: string | null | undefined, alpha: number): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
