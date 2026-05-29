export const APP_NAME = 'Tablero Operativo'

/** Rutas según módulos de lovable-spec §5 */
export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  /** Cadena causa–efecto: BHAG, FCE, procesos O2C, ejecución. */
  ESTRATEGIA: '/estrategia',
  DASHBOARD_KPIS: '/dashboard/kpis',
  DASHBOARD_GAPS: '/dashboard/gaps',
  DASHBOARD_IMPACTO: '/dashboard/impacto',
  KANBAN: '/kanban',
  SPRINTS: '/sprints',
  DISCIPLINA: '/disciplina',
  AREAS: '/areas',
  CALENDARIO: '/calendario',
  REPORTES: '/reportes',
  NOTIFICACIONES: '/notificaciones',
  DISTANCIAS: '/distancias',
  ACADEMIA: '/academia',
  MANUAL: '/manual',
  /** Asistente IA O2C (proxy Edge Functions → Lovable). */
  AI_ASSIST: '/asistente-ia',
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
  SETTINGS_ACADEMY_MODULES: '/settings/academy/modules',
} as const
