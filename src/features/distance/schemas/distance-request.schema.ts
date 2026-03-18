/**
 * Validación Zod para el formulario de solicitud del tablero de distancias.
 * Ruta opcional; fecha, hora_alta, origin_id y destination_id requeridos.
 */

import { z } from 'zod'

const requiredTrim = (msg: string) =>
  z.string().transform((s) => (s ?? '').trim()).pipe(z.string().min(1, msg))

const SENTINEL_EMPTY = '__none__'

export const distanceRequestFormSchema = z
  .object({
    ruta: z.string().optional(),
    fecha: z.string().min(1, 'La fecha es obligatoria'),
    hora_alta: z.string().min(1, 'La hora de alta es obligatoria'),
    origin_id: requiredTrim('El origen es obligatorio'),
    destination_id: requiredTrim('El destino es obligatorio'),
  })
  .refine((data) => data.origin_id !== SENTINEL_EMPTY, {
    message: 'Selecciona un origen',
    path: ['origin_id'],
  })
  .refine((data) => data.destination_id !== SENTINEL_EMPTY, {
    message: 'Selecciona un destino',
    path: ['destination_id'],
  })
  .refine((data) => data.origin_id !== data.destination_id, {
    message: 'Origen y destino deben ser distintos',
    path: ['destination_id'],
  })

export type DistanceRequestFormSchema = z.infer<typeof distanceRequestFormSchema>
