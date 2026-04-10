/**
 * Registro de catálogos y dependencias para escalabilidad.
 * Usar para:
 * - Validar antes de desactivar (ej. no desactivar rol si hay usuarios usándolo)
 * - Mensajes de error al eliminar
 * - Futuras FKs o reglas de negocio entre catálogos
 *
 * Ver docs/catalogs-evolution.md para evolución (soft delete, orden, etc.)
 */

export type CatalogKey =
  | 'catalog_roles'
  | 'areas'
  | 'statuses'
  | 'priorities'
  | 'dropdown_catalogs'
  | 'dropdown_options'
  | 'catalog_kpis'
  | 'gaps'

/** Dependencias conocidas: "este catálogo es referido por estos módulos/tablas" */
export const CATALOG_DEPENDENCIES: Record<
  CatalogKey,
  { table?: string; label: string }[]
> = {
  catalog_roles: [
    { table: 'usuarios', label: 'Usuarios (rol)' },
  ],
  areas: [
    { table: 'usuarios', label: 'Usuarios (área)' },
  ],
  statuses: [],
  priorities: [],
  dropdown_catalogs: [
    { table: 'dropdown_options', label: 'Opciones del catálogo' },
  ],
  dropdown_options: [],
  catalog_kpis: [],
  gaps: [
    { table: 'catalog_kpis', label: 'KPIs de catálogo (gap_id)' },
    { table: 'acciones_diarias', label: 'Acciones (gap_id)' },
  ],
}

export function getDependencies(key: CatalogKey): { table?: string; label: string }[] {
  return CATALOG_DEPENDENCIES[key] ?? []
}
