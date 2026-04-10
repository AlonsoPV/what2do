import { z } from 'zod'
import { nombreField, descripcionField, activoField } from './common'
import { LIMITS, VALIDATION } from '../constants/validation'

const gapStatusEnum = z.enum(['open', 'in_progress', 'resolved', 'closed'])

export const gapFormSchema = z.object({
  nombre: nombreField,
  descripcion: descripcionField,
  prioridad: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((s) => (s == null || String(s).trim() === '' ? null : String(s).trim()))
    .pipe(z.union([z.null(), z.string().max(120)])),
  status: gapStatusEnum,
  area: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((s) => (s == null || String(s).trim() === '' ? null : String(s).trim()))
    .pipe(z.union([z.null(), z.string().max(120)])),
  owner_usuario: z
    .union([z.literal('__none__'), z.literal(''), z.undefined(), z.string().uuid()])
    .transform((v) =>
      v === '' || v === undefined || v === '__none__' ? null : v
    ),
  total_story_points: z.coerce
    .number()
    .min(LIMITS.ordenMin, VALIDATION.ordenMin)
    .finite(),
  activo: activoField,
})

export type GapFormValues = z.output<typeof gapFormSchema>
export type GapFormInputValues = z.input<typeof gapFormSchema>
