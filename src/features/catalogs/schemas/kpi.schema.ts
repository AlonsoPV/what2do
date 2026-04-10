import { z } from 'zod'
import {
  nombreField,
  descripcionField,
  ordenField,
  activoField,
} from './common'

const KPI_UNITS = ['porcentaje', 'numero', 'dias', 'moneda', 'horas', 'cantidad'] as const
const KPI_TYPES = ['manual', 'calculado', 'informativo'] as const
const KPI_PERIODICITIES = ['diaria', 'semanal', 'mensual', 'trimestral', 'anual'] as const
const KPI_CALC_TYPES = ['minimize', 'maximize', 'binary'] as const

const metaObjetivoField = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === '' || v == null ? null : Number(v)))
  .pipe(z.number().nullable())

const optionalNum = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === '' || v == null ? null : Number(v)))
  .pipe(z.number().finite().nullable())

const weightField = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === '' || v == null ? null : Number(v)))
  .pipe(z.number().min(0).max(1).nullable())

const thresholdField = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === '' || v == null ? null : Number(v)))
  .pipe(z.number().min(0).max(1).nullable())

const gapIdField = z
  .union([z.string(), z.null()])
  .transform((v) => (!v || String(v).trim() === '' ? null : String(v).trim()))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, {
    message: 'Selecciona un gap válido',
  })

const ownerField = z
  .union([z.string(), z.null()])
  .transform((v) => (!v || String(v).trim() === '' ? null : String(v).trim()))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, {
    message: 'Responsable inválido',
  })

/**
 * Catálogo KPI + negocio O2C.
 * La suma global de pesos (activos, con gap, en portfolio) se valida al guardar contra el listado en BD.
 */
export const kpiFormSchema = z
  .object({
    nombre: nombreField,
    descripcion: descripcionField,
    unidad: z.enum(KPI_UNITS),
    tipo: z.enum(KPI_TYPES),
    meta_objetivo: metaObjetivoField,
    periodicidad: z.enum(KPI_PERIODICITIES),
    orden: ordenField,
    activo: activoField,
    gap_id: gapIdField,
    weight: weightField,
    baseline: optionalNum,
    target_m6: optionalNum,
    target_m12: optionalNum,
    target_m18: optionalNum,
    calc_type: z.enum(KPI_CALC_TYPES),
    in_global_portfolio: z.boolean(),
    threshold_green: thresholdField,
    threshold_yellow: thresholdField,
    owner_usuario: ownerField,
  })
  .superRefine((data, ctx) => {
    const g = data.threshold_green
    const y = data.threshold_yellow
    if (g != null && y != null && g < y) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El umbral verde debe ser ≥ al umbral amarillo (sobre cumplimiento 0–1).',
        path: ['threshold_green'],
      })
    }
    if (data.activo && data.in_global_portfolio && !data.gap_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Un KPI activo en el portafolio global requiere un gap.',
        path: ['gap_id'],
      })
    }
  })

export type KpiFormValues = z.infer<typeof kpiFormSchema>
export { KPI_UNITS, KPI_TYPES, KPI_PERIODICITIES, KPI_CALC_TYPES }
