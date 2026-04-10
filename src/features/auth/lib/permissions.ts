/**
 * Utilidades para permisos y control de acceso.
 * Base para RLS y restricciones por rol.
 *
 * Modelo de datos:
 * - auth.users = identidad de acceso (sesión).
 * - usuarios = perfil de negocio (nombre, rol de catálogo, área); sin fila aquí no hay permisos en el tablero.
 * - user_roles.app_role = rol de aplicación (admin / super_admin) para Settings y políticas; no confundir con `usuarios.rol`.
 * - Datos de negocio: created_by, assigned_to, updated_by
 */

import type { Usuario } from '@/types'

/** Roles que tienen privilegios de admin (spec §2.2). */
const ADMIN_ROLES = ['DG', 'Sistemas'] as const

/** app_role se obtendría de user_roles; por ahora no se expone en perfil. */
export type AppRole = 'admin' | 'viewer' | 'super_admin'

/**
 * Indica si el rol de negocio tiene privilegios de administrador.
 * Spec: DG y Sistemas son tratados como admin.
 */
export function isAdminByRole(rol: string): boolean {
  return ADMIN_ROLES.some((r) => r === rol)
}

/**
 * Comprueba si el usuario puede editar un recurso.
 * Por ahora: admins pueden; resto según created_by/assigned_to (lógica en cada módulo).
 */
export function canEditAsCreator(profile: Usuario | null, createdBy: string | null): boolean {
  if (!profile) return false
  if (isAdminByRole(profile.rol)) return true
  return createdBy === profile.id
}

/**
 * Comprueba si el usuario puede editar un recurso asignado.
 */
export function canEditAsAssignee(profile: Usuario | null, assignedTo: string | null): boolean {
  if (!profile) return false
  if (isAdminByRole(profile.rol)) return true
  return assignedTo === profile.id
}
