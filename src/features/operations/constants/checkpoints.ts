/** Mensaje al intentar pasar a Hecho con validaciones pendientes (cliente + coherente con trigger en BD). */
export const MSJ_HECHO_CHECKPOINTS_PENDIENTES =
  'No puedes marcar esta acción como Hecha porque aún existen puntos de validación pendientes.'

/** Mensaje único para evidencia obligatoria al cerrar (misma regla que `assertCanCloseAccion`). */
export const MSJ_HECHO_EVIDENCIA_REQUERIDA =
  'No se puede marcar como Hecho sin evidencia cargada.'
