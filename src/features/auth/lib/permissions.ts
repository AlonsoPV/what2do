/**
 * Utilidades para permisos y control de acceso.
 *
 * Modelo de datos:
 * - auth.users = identidad de acceso.
 * - usuarios = perfil de negocio (nombre, rol de catalogo, area).
 * - user_roles.app_role = rol de aplicacion (admin / super_admin).
 */

import { ROUTES } from '@/constants'
import type { Usuario } from '@/types'

/** Roles que tienen privilegios de admin (spec 2.2). */
const ADMIN_ROLES = ['DG', 'Sistemas', 'super_admin'] as const
const ANALYST_ROLE = 'Analista'
const SUPER_ADMIN_ROLE = 'super_admin'

const ANALYST_ALLOWED_ROUTES = [
  ROUTES.KANBAN,
  ROUTES.ACADEMIA,
  ROUTES.DISCIPLINA,
  ROUTES.CALENDARIO,
  ROUTES.NOTIFICACIONES,
  ROUTES.MANUAL,
  ROUTES.SETTINGS,
  ROUTES.SETTINGS_PROFILE,
] as const

/** app_role se obtendria de user_roles; por ahora no se expone en perfil. */
export type AppRole = 'admin' | 'viewer' | 'super_admin'

/**
 * Indica si el rol de negocio tiene privilegios de administrador.
 * Spec: DG y Sistemas son tratados como admin.
 */
export function isAdminByRole(rol: string | null | undefined): boolean {
  const normalized = (rol ?? '').trim().toLocaleLowerCase('es-MX')
  return ADMIN_ROLES.some((r) => r.toLocaleLowerCase('es-MX') === normalized)
}

export function isAnalystByRole(rol: string | null | undefined): boolean {
  return (rol ?? '').trim().toLocaleLowerCase('es-MX') === ANALYST_ROLE.toLocaleLowerCase('es-MX')
}

export function isSuperAdminByRole(rol: string | null | undefined): boolean {
  return (rol ?? '').trim().toLocaleLowerCase('es-MX') === SUPER_ADMIN_ROLE
}

export function canAccessRouteByRole(rol: string | null | undefined, pathname: string): boolean {
  if (!isAnalystByRole(rol)) return true
  return ANALYST_ALLOWED_ROUTES.some((route) => {
    if (route === ROUTES.SETTINGS) return pathname === ROUTES.SETTINGS
    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

export function getDefaultRouteByRole(rol: string | null | undefined): string {
  return isAnalystByRole(rol) ? ROUTES.KANBAN : ROUTES.DASHBOARD
}

/**
 * Comprueba si el usuario puede editar un recurso.
 * Por ahora: admins pueden; resto segun created_by/assigned_to.
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
