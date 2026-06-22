export const APP_NAME = 'SCRUMBAN'

/** Rutas según módulos de lovable-spec §5 */
export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  DASHBOARD_KPIS: '/dashboard/kpis',
  DASHBOARD_GAPS: '/dashboard/gaps',
  DASHBOARD_IMPACTO: '/dashboard/impacto',
  KANBAN: '/kanban',
  TICKETS: '/tickets',
  SPRINTS: '/sprints',
  DISCIPLINA: '/disciplina',
  AREAS: '/areas',
  CALENDARIO: '/calendario',
  REPORTES: '/reportes',
  NOTIFICACIONES: '/notificaciones',
  DISTANCIAS: '/distancias',
  MANUAL: '/manual',
  /** Plan de acción Scrum Master — acceso restringido por usuario. */
  PLAN_ACCION: '/plan-accion',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_USERS: '/settings/users',
  SETTINGS_USERS_DETAIL: '/settings/users/:id',
  SETTINGS_CATALOGS: '/settings/catalogs',
  SETTINGS_CATALOGS_ROLES: '/settings/catalogs/roles',
  SETTINGS_CATALOGS_AREAS: '/settings/catalogs/areas',
  SETTINGS_CATALOGS_STATUSES: '/settings/catalogs/statuses',
  SETTINGS_CATALOGS_PRIORITIES: '/settings/catalogs/priorities',
  SETTINGS_CATALOGS_DROPDOWNS: '/settings/catalogs/dropdowns',
  SETTINGS_CATALOGS_DROPDOWNS_OPTIONS: '/settings/catalogs/dropdowns/:catalogId',
  SETTINGS_CATALOGS_KPIS: '/settings/catalogs/kpis',
  SETTINGS_CATALOGS_GAPS: '/settings/catalogs/gaps',
} as const

/** Exportar minutas, acciones y recordatorios a Google Calendar / Tasks / Gmail. */
export const GOOGLE_WORKSPACE_CALENDAR_SYNC_ENABLED =
  import.meta.env.VITE_GOOGLE_WORKSPACE_CALENDAR_SYNC_ENABLED !== 'false'
