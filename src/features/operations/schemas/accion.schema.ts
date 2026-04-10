/**
 * Schema Zod para crear/editar acción diaria (spec §5.1).
 * Descripción en tres partes (Cómo / Quiero / Para qué) → una sola columna `descripcion_accion`.
 */

import { z } from 'zod'
import { ACTION_STATUS, PRIORIDAD_NC } from '@/types'
import { formatDescripcionTriada } from '../utils/descripcionAccionTriada'

const tituloAccionSchema = z
  .string()
  .transform((s) => (s ?? '').trim())
  .pipe(z.string().max(70, 'Máximo 70 caracteres'))

/** Cada respuesta de la triada (5–400 caracteres). */
const descripcionParteSchema = z
  .string()
  .min(1, 'Este campo es obligatorio')
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(5, 'Mínimo 5 caracteres')
      .max(400, 'Máximo 400 caracteres')
  )

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

const accionInputShape = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD').optional(),
  titulo_accion: tituloAccionSchema,
  descripcion_como: descripcionParteSchema,
  descripcion_quiero: descripcionParteSchema,
  descripcion_para_que: descripcionParteSchema,
  responsable: z.string().uuid('Responsable obligatorio'),
  hora_limite: horaSchema,
  evidencia_esperada: evidenciaEsperadaSchema,
  estado: z.enum(ACTION_STATUS as unknown as [string, ...string[]]).optional(),
  prioridad: z.enum(PRIORIDAD_NC as unknown as [string, ...string[]]).optional(),
  kpi_afectado: z.string().uuid().nullable().optional(),
  /** Brechas O2C impactadas (tabla puente + columna primaria = primer id). */
  gap_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  /** KPIs de catálogo impactados (tabla puente + columna primaria = primer id). */
  catalog_kpi_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  okr_impactado: z.string().uuid().nullable().optional(),
  proceso: z.string().uuid().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  causa_raiz: z.string().trim().nullable().optional(),
  responsable_bloqueo: z.string().uuid().nullable().optional(),
})

export const accionCreateSchema = accionInputShape.transform(
  ({
    descripcion_como,
    descripcion_quiero,
    descripcion_para_que,
    gap_ids,
    catalog_kpi_ids,
    ...rest
  }) => {
    const gids = gap_ids ?? []
    const kids = catalog_kpi_ids ?? []
    return {
      ...rest,
      descripcion_accion: formatDescripcionTriada(descripcion_como, descripcion_quiero, descripcion_para_que),
      gap_ids: gids,
      catalog_kpi_ids: kids,
      gap_id: gids[0] ?? null,
      catalog_kpi_id: kids[0] ?? null,
    }
  }
)

/** Valores del formulario antes del transform (tres preguntas). */
export type AccionFormInput = z.input<typeof accionCreateSchema>

/** Payload tras validar (incluye `descripcion_accion` unificado). */
export type AccionCreateInput = z.output<typeof accionCreateSchema>

export const accionUpdateSchema = z
  .object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD').optional(),
    titulo_accion: tituloAccionSchema.optional(),
    descripcion_accion: z
      .string()
      .min(15, 'Mínimo 15 caracteres')
      .max(1300, 'Máximo 1300 caracteres')
      .optional(),
    responsable: z.string().uuid().optional(),
    hora_limite: horaSchema.optional(),
    evidencia_esperada: z.string().min(5).max(500).optional(),
    estado: z.enum(ACTION_STATUS as unknown as [string, ...string[]]).optional(),
    prioridad: z.enum(PRIORIDAD_NC as unknown as [string, ...string[]]).optional(),
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
  })
  .partial()

export type AccionUpdateInput = z.infer<typeof accionUpdateSchema>
