import type { Priority } from '@/features/catalogs/types/catalogs.types'

type AccionPrioridadSource = {
  prioridad: string
  prioridad_id?: string | null
}

function normalizeNombre(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export function findPriorityForAccion(
  accion: AccionPrioridadSource,
  priorities: Priority[]
): Priority | undefined {
  if (accion.prioridad_id) {
    const byId = priorities.find((p) => p.id === accion.prioridad_id)
    if (byId) return byId
  }

  const key = normalizeNombre(accion.prioridad)
  if (!key) return undefined

  return priorities.find((p) => normalizeNombre(p.nombre) === key)
}

/** Nombre de prioridad alineado al catálogo (por ID o por nombre). */
export function resolveAccionPrioridadNombre(
  accion: AccionPrioridadSource,
  priorities: Priority[]
): string {
  const match = findPriorityForAccion(accion, priorities)
  if (match) return match.nombre
  return accion.prioridad?.trim() ?? ''
}

export function resolveAccionPrioridadId(
  accion: AccionPrioridadSource,
  priorities: Priority[]
): string | null {
  if (accion.prioridad_id) {
    const byId = priorities.find((p) => p.id === accion.prioridad_id)
    if (byId) return byId.id
  }
  return findPriorityForAccion(accion, priorities)?.id ?? null
}
