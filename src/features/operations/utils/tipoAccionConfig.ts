export type TipoAccion = 'operativa' | 'sprint' | 'estrategica'
export type EsfuerzoAccion =
  | 'configuracion'
  | 'reporte'
  | 'integracion'
  | 'dashboard'
  | 'automatizacion'
  | 'otro'

export type TipoAccionConfig = {
  label: string
  shortLabel: string
  description: string
  intent: string
  requiresSprint: boolean
  allowsSprint: boolean
  defaultStoryPoints: number
  puntosMin: number
  puntosMax: number
  puntosSugerido: number
}

export const TIPO_ACCION_CONFIG: Record<TipoAccion, TipoAccionConfig> = {
  operativa: {
    label: 'Operativa',
    shortLabel: 'RUN',
    description: 'Trabajo diario o recurrente.',
    intent: 'Mantiene la operacion funcionando; puede vivir fuera de sprints.',
    requiresSprint: false,
    allowsSprint: false,
    defaultStoryPoints: 0,
    puntosMin: 0,
    puntosMax: 0,
    puntosSugerido: 0,
  },
  sprint: {
    label: 'Sprint',
    shortLabel: 'CHANGE',
    description: 'Trabajo enfocado en un objetivo temporal.',
    intent: 'Agrupa acciones de transformacion dentro de un sprint activo o planificado.',
    requiresSprint: true,
    allowsSprint: true,
    defaultStoryPoints: 3,
    puntosMin: 1,
    puntosMax: 13,
    puntosSugerido: 3,
  },
  estrategica: {
    label: 'Estrategica',
    shortLabel: 'STRATEGY',
    description: 'Trabajo vinculado a una prioridad o iniciativa mayor.',
    intent: 'Puede vivir con sprint si forma parte de una iniciativa temporal.',
    requiresSprint: false,
    allowsSprint: true,
    defaultStoryPoints: 3,
    puntosMin: 1,
    puntosMax: 13,
    puntosSugerido: 3,
  },
}

export const TIPO_ACCION_OPTIONS = Object.entries(TIPO_ACCION_CONFIG).map(
  ([value, cfg]) => ({ value: value as TipoAccion, ...cfg })
)

export type EsfuerzoAccionConfig = {
  label: string
  description: string
  puntosMin: number
  puntosMax: number
  puntosSugerido: number
}

export const ESFUERZO_ACCION_CONFIG: Record<EsfuerzoAccion, EsfuerzoAccionConfig> = {
  configuracion: {
    label: 'Configuracion / ajuste',
    description: 'Cambio de parametro, regla de validacion, ajuste simple',
    puntosMin: 1,
    puntosMax: 3,
    puntosSugerido: 2,
  },
  reporte: {
    label: 'Reporte / consulta',
    description: 'Reporte nuevo, vista de datos, extraccion',
    puntosMin: 1,
    puntosMax: 3,
    puntosSugerido: 3,
  },
  integracion: {
    label: 'Integracion',
    description: 'Integracion parcial o completa entre sistemas',
    puntosMin: 5,
    puntosMax: 8,
    puntosSugerido: 5,
  },
  dashboard: {
    label: 'Dashboard / modulo',
    description: 'Dashboard nuevo, modulo de UI, integracion de datos visual',
    puntosMin: 5,
    puntosMax: 8,
    puntosSugerido: 8,
  },
  automatizacion: {
    label: 'Automatizacion / API',
    description: 'API end-to-end, algoritmo complejo, automatizacion core',
    puntosMin: 13,
    puntosMax: 13,
    puntosSugerido: 13,
  },
  otro: {
    label: 'Otro',
    description: 'Sin categoria definida; asignar puntos manualmente',
    puntosMin: 1,
    puntosMax: 13,
    puntosSugerido: 0,
  },
}

export const ESFUERZO_ACCION_OPTIONS = Object.entries(ESFUERZO_ACCION_CONFIG).map(
  ([value, cfg]) => ({ value: value as EsfuerzoAccion, ...cfg })
)

/** Escala Fibonacci valida para ponderar avance de sprint o iniciativas. */
export const STORY_POINTS_OPTIONS = [1, 2, 3, 5, 8, 13] as const
