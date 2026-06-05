/**
 * Enums alineados con el esquema Postgres (lovable-spec §8).
 * Mantener en sync con migraciones Supabase.
 */

export const USER_ROLE = [
  'DG',
  'Sistemas',
  'Operaciones',
  'Planeación',
  'Calidad',
  'Evidencias',
  'Finanzas',
  'Mantenimiento',
  'RH',
  'Comercial',
  'Operativo',
  'Dirección',
] as const

export type UserRole = (typeof USER_ROLE)[number]

export const APP_ROLE = ['admin', 'super_admin', 'viewer'] as const
export type AppRole = (typeof APP_ROLE)[number]

export const ACTION_STATUS = [
  'Pendiente',
  'Hoy',
  'En_Ejecucion',
  'Bloqueado',
  'Retraso',
  'Hecho',
  'Verificado',
] as const

export type ActionStatus = (typeof ACTION_STATUS)[number]

export const TICKET_STATUS = ['Nuevo', 'En proceso', 'Respuesta', 'Cerrado'] as const
export type TicketStatus = (typeof TICKET_STATUS)[number]

export const PRIORIDAD_NC = ['P1_Critica', 'P2_Media', 'P3_Baja'] as const
export type PrioridadNc = (typeof PRIORIDAD_NC)[number]

export const NOMBRE_KPI = [
  'OTIF',
  'Incidencias',
  'Evidencias_T_mas_cero',
  'DSO',
  'Margen',
  'NPS',
] as const

export type NombreKpi = (typeof NOMBRE_KPI)[number]

export const KPI_UNIDAD = ['porcentaje', 'numero', 'dias', 'moneda'] as const
export type KpiUnidad = (typeof KPI_UNIDAD)[number]

/** Semáforo KPI (spec §9) */
export const KPI_SEMAFORO = ['verde', 'amarillo', 'rojo'] as const
export type KpiSemaforo = (typeof KPI_SEMAFORO)[number]
