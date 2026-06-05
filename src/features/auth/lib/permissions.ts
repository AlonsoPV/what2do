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
const OPERATIVE_ROLE = 'Operativo'
const LEGACY_ANALYST_ROLE = 'Analista'
const DIRECTION_ROLE = 'Direccion'
const SUPER_ADMIN_ROLE = 'super_admin'

const ANALYST_ALLOWED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.KANBAN,
  ROUTES.TICKETS,
  ROUTES.ACADEMIA,
  ROUTES.DISCIPLINA,
  ROUTES.CALENDARIO,
  ROUTES.NOTIFICACIONES,
  ROUTES.MANUAL,
  ROUTES.SETTINGS,
  ROUTES.SETTINGS_PROFILE,
] as const

const DIRECTION_ALLOWED_ROUTES = [
  ...ANALYST_ALLOWED_ROUTES,
  ROUTES.SETTINGS_USERS,
  ROUTES.SETTINGS_USERS_DETAIL,
  ROUTES.SETTINGS_CATALOGS,
  ROUTES.SETTINGS_CATALOGS_ROLES,
  ROUTES.SETTINGS_CATALOGS_AREAS,
  ROUTES.SETTINGS_CATALOGS_STATUSES,
  ROUTES.SETTINGS_CATALOGS_PRIORITIES,
  ROUTES.SETTINGS_CATALOGS_DROPDOWNS,
  ROUTES.SETTINGS_CATALOGS_DROPDOWNS_OPTIONS,
  ROUTES.SETTINGS_CATALOGS_KPIS,
  ROUTES.SETTINGS_CATALOGS_GAPS,
  ROUTES.SETTINGS_ACADEMY_MODULES,
] as const

/** Rutas del bloque «Por Liberar» y módulos no disponibles para Operativo. */
const ANALYST_DENIED_ROUTES = [
  ROUTES.ESTRATEGIA,
  ROUTES.AI_ASSIST,
  ROUTES.DASHBOARD_KPIS,
  ROUTES.DASHBOARD_GAPS,
  ROUTES.DASHBOARD_IMPACTO,
  ROUTES.SPRINTS,
  ROUTES.REPORTES,
  ROUTES.PLAN_ACCION,
  ROUTES.DISTANCIAS,
  ROUTES.AREAS,
] as const

/** app_role se obtendria de user_roles; por ahora no se expone en perfil. */
export type AppRole = 'admin' | 'viewer' | 'super_admin'

function normalizeRole(rol: string | null | undefined): string {
  return (rol ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
}

function routeMatches(pathname: string, route: string): boolean {
  if (route.includes(':')) {
    const routeParts = route.split('/').filter(Boolean)
    const pathParts = pathname.split('/').filter(Boolean)
    return (
      routeParts.length === pathParts.length &&
      routeParts.every((part, index) => part.startsWith(':') || part === pathParts[index])
    )
  }

  if (route === ROUTES.SETTINGS) return pathname === ROUTES.SETTINGS
  // Solo dashboard principal; subrutas (/dashboard/kpis, etc.) se controlan por ruta explicita.
  if (route === ROUTES.DASHBOARD) return pathname === ROUTES.DASHBOARD
  return pathname === route || pathname.startsWith(`${route}/`)
}

/**
 * Indica si el rol de negocio tiene privilegios de administrador.
 * Spec: DG y Sistemas son tratados como admin.
 */
export function isAdminByRole(rol: string | null | undefined): boolean {
  const normalized = normalizeRole(rol)
  return ADMIN_ROLES.some((r) => normalizeRole(r) === normalized)
}

export function isOperativeByRole(rol: string | null | undefined): boolean {
  const normalized = normalizeRole(rol)
  const operative = normalizeRole(OPERATIVE_ROLE)
  const legacyAnalyst = normalizeRole(LEGACY_ANALYST_ROLE)
  return (
    normalized === operative ||
    normalized.includes(operative) ||
    normalized === legacyAnalyst ||
    normalized.includes(legacyAnalyst)
  )
}

/** Alias de compatibilidad; preferir isOperativeByRole. */
export const isAnalystByRole = isOperativeByRole

export function isDirectionByRole(rol: string | null | undefined): boolean {
  return normalizeRole(rol) === normalizeRole(DIRECTION_ROLE)
}

export function usesOperationalDashboardByRole(rol: string | null | undefined): boolean {
  return isOperativeByRole(rol) || isDirectionByRole(rol)
}

export function isSuperAdminByRole(rol: string | null | undefined): boolean {
  return normalizeRole(rol) === normalizeRole(SUPER_ADMIN_ROLE)
}

export function canManageAcademyModulesByRole(rol: string | null | undefined): boolean {
  return isSuperAdminByRole(rol) || isDirectionByRole(rol)
}

export function canAccessRouteByRole(rol: string | null | undefined, pathname: string): boolean {
  if (isDirectionByRole(rol)) {
    return DIRECTION_ALLOWED_ROUTES.some((route) => routeMatches(pathname, route))
  }

  if (!isOperativeByRole(rol)) return true

  if (
    ANALYST_DENIED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    return false
  }

  return ANALYST_ALLOWED_ROUTES.some((route) => routeMatches(pathname, route))
}

export function getDefaultRouteByRole(_rol: string | null | undefined): string {
  void _rol
  return ROUTES.DASHBOARD
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
