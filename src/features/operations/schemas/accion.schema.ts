/**
 * Schema Zod para crear/editar acción diaria (spec §5.1).
 * Instrucciones en un solo campo: `instrucciones_especificas`.
 */

import { z } from 'zod'
import { ACTION_STATUS } from '@/types'
import { DEFAULT_PRIORITY_NOMBRE } from '../utils/priorityLabels'
import { STORY_POINTS_OPTIONS } from '../utils/tipoAccionConfig'

const TIPO_ACCION_ENUM = z.enum(['operativa', 'sprint', 'estrategica', 'desbloqueo'])

const tituloAccionSchema = z
  .string()
  .transform((s) => (s ?? '').trim())
  .pipe(z.string().max(70, 'Máximo 70 caracteres'))

const evidenciaEsperadaSchema = z
  .string()
  .min(1, 'La evidencia esperada es obligatoria')
  .transform((s) => s.trim())
  .pipe(z.string().min(5, 'Mínimo 5 caracteres'))

/** Formato hora HH:MM (sin segundos) */
const horaSchema = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/, 'Formato HH:MM')
  .refine(
    (v) => {
      const [h, m] = v.split(':').map(Number)
      return h >= 0 && h <= 23 && m >= 0 && m <= 59
    },
    { message: 'Hora inválida' }
  )

const INSTRUCCIONES_MIN = 15

const instruccionesSchema = z
  .string()
  .min(1, 'Las instrucciones específicas son obligatorias')
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(INSTRUCCIONES_MIN, `Mínimo ${INSTRUCCIONES_MIN} caracteres`)
      .max(1200, 'Máximo 1200 caracteres')
  )

const accionInputShape = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD').optional(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD').nullable().optional(),
  no_actividad: z.string().trim().max(40, 'Máximo 40 caracteres').nullable().optional(),
  titulo_accion: tituloAccionSchema,
  instrucciones_especificas: instruccionesSchema,
  objetivo: z.string().trim().max(700, 'Máximo 700 caracteres').nullable().optional(),
  responsable: z.string().uuid('Responsable obligatorio'),
  hora_limite: horaSchema,
  evidencia_esperada: evidenciaEsperadaSchema,
  estado: z.enum(ACTION_STATUS as unknown as [string, ...string[]]).optional(),
  prioridad: z
    .string()
    .min(1, 'Prioridad obligatoria')
    .max(100)
    .optional()
    .default(DEFAULT_PRIORITY_NOMBRE),
  kpi_afectado: z.string().uuid().nullable().optional(),
  gap_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  catalog_kpi_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  okr_impactado: z.string().uuid().nullable().optional(),
  proceso: z.string().uuid().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  causa_raiz: z.string().trim().nullable().optional(),
  responsable_bloqueo: z.string().uuid().nullable().optional(),
  tipo_accion: TIPO_ACCION_ENUM.default('operativa'),
  story_points: z
    .number()
    .refine(
      (v) => v === 0 || (STORY_POINTS_OPTIONS as readonly number[]).includes(v),
      {
        message: 'Debe ser 0 o un valor Fibonacci: 1, 2, 3, 5, 8 o 13',
      }
    )
    .default(0),
  sprint_id: z.string().uuid().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.tipo_accion === 'sprint' && !value.sprint_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sprint_id'],
      message: 'Selecciona un sprint para una accion de sprint.',
    })
  }
  if (value.tipo_accion === 'desbloqueo' && !value.responsable_bloqueo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['responsable_bloqueo'],
      message: 'Selecciona quien debe desbloquear esta accion.',
    })
  }
})

export const accionCreateSchema = accionInputShape.transform(
  ({ gap_ids, catalog_kpi_ids, instrucciones_especificas, ...rest }) => {
    const gids = gap_ids ?? []
    const kids = catalog_kpi_ids ?? []
    const instrucciones = instrucciones_especificas.trim()
    return {
      ...rest,
      instrucciones_especificas: instrucciones,
      descripcion_accion: instrucciones,
      gap_ids: gids,
      catalog_kpi_ids: kids,
      gap_id: gids[0] ?? null,
      catalog_kpi_id: kids[0] ?? null,
    }
  }
)

export type AccionFormInput = z.input<typeof accionCreateSchema>

export type AccionCreateInput = z.output<typeof accionCreateSchema>

export const accionUpdateSchema = z
  .object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD').optional(),
    fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD').nullable().optional(),
    no_actividad: z.string().trim().max(40).nullable().optional(),
    titulo_accion: tituloAccionSchema.optional(),
    instrucciones_especificas: z.string().trim().min(INSTRUCCIONES_MIN).max(1200).optional(),
    objetivo: z.string().trim().max(700).nullable().optional(),
    descripcion_accion: z.string().min(INSTRUCCIONES_MIN).max(1300).optional(),
    responsable: z.string().uuid().optional(),
    hora_limite: horaSchema.optional(),
    evidencia_esperada: z.string().min(5).max(500).optional(),
    estado: z.enum(ACTION_STATUS as unknown as [string, ...string[]]).optional(),
    prioridad: z.string().min(1, 'Prioridad obligatoria').max(100).optional(),
    kpi_afectado: z.string().uuid().nullable().optional(),
    gap_id: z.string().uuid().nullable().optional(),
    catalog_kpi_id: z.string().uuid().nullable().optional(),
    gap_ids: z.array(z.string().uuid()).max(50).optional(),
    catalog_kpi_ids: z.array(z.string().uuid()).max(50).optional(),
    okr_impactado: z.string().uuid().nullable().optional(),
    proceso: z.string().uuid().nullable().optional(),
    area: z.string().trim().nullable().optional(),
    cliente_id: z.string().uuid().nullable().optional(),
    causa_raiz: z.string().trim().nullable().optional(),
    responsable_bloqueo: z.string().uuid().nullable().optional(),
    evidencia_cargada: z.boolean().optional(),
    evidencia_adjunta: z.string().trim().nullable().optional(),
    tipo_accion: TIPO_ACCION_ENUM.optional(),
    story_points: z
      .number()
      .refine(
        (v) => v === 0 || (STORY_POINTS_OPTIONS as readonly number[]).includes(v),
        {
          message: 'Debe ser 0 o un valor Fibonacci: 1, 2, 3, 5, 8 o 13',
        }
      )
      .optional(),
    sprint_id: z.string().uuid().nullable().optional(),
  })
  .partial()
  .superRefine((value, ctx) => {
    if (value.tipo_accion === 'sprint' && !value.sprint_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sprint_id'],
        message: 'Selecciona un sprint para una accion de sprint.',
      })
    }
    if (value.tipo_accion === 'desbloqueo' && !value.responsable_bloqueo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['responsable_bloqueo'],
        message: 'Selecciona quien debe desbloquear esta accion.',
      })
    }
  })

export type AccionUpdateInput = z.infer<typeof accionUpdateSchema>
