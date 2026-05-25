import { PLAN_ACCION_ALLOWED_USUARIO_ID } from '../constants'

/** Acceso solo si `usuarios.id` coincide con el ID autorizado. */
export function hasPlanAccionAccess(usuario: { id: string } | null | undefined): boolean {
  if (!usuario?.id) return false
  return usuario.id === PLAN_ACCION_ALLOWED_USUARIO_ID
}
