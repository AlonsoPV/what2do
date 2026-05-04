/**
 * Validación al cambiar `estado` en acciones_diarias: permisos Hecho/Verificado
 * y reglas de cierre (checklist activo) para Hecho.
 */

import {
  assertCanCloseAccionFromAccion,
  type CloseAccionValidationOptions,
} from '@/services/accionCloseValidation.service'
import { usuariosService } from '@/services/usuarios.service'
import { supabase } from '@/lib/supabase/client'
import { isAdminByRole } from '@/features/auth/lib/permissions'
import {
  MSJ_PERMISO_HECHO,
  MSJ_PERMISO_VERIFICADO,
} from '@/features/operations/utils/actionPermissions'
import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types'

async function resolveCurrentUsuarioForEstado() {
  const { data: auth } = await supabase.auth.getUser()
  const authId = auth.user?.id
  if (!authId) return { usuario: null as Awaited<ReturnType<typeof usuariosService.getByAuthId>> }
  const usuario = await usuariosService.getByAuthId(authId)
  return { usuario }
}

function assertHechoVerificadoPermissions(
  prev: AccionDiaria,
  nextEstado: ActionStatus,
  currentUsuarioId: string | null,
  bypassByBusinessRole: boolean
): void {
  if (nextEstado === prev.estado) return
  if (bypassByBusinessRole) return
  if (nextEstado === 'Hecho') {
    const ok =
      !!currentUsuarioId &&
      (prev.responsable === currentUsuarioId ||
        (prev.created_by != null && prev.created_by === currentUsuarioId))
    if (!ok) throw new Error(MSJ_PERMISO_HECHO)
    return
  }
  if (nextEstado === 'Verificado') {
    const ok =
      !!currentUsuarioId &&
      prev.created_by != null &&
      prev.created_by === currentUsuarioId
    if (!ok) throw new Error(MSJ_PERMISO_VERIFICADO)
  }
}

/**
 * Lanza Error con mensaje claro si el cambio de estado no está permitido
 * o no cumple cierre a Hecho (checkpoints pendientes).
 * Roles DG/Sistemas omiten la regla creador/responsable (perfil `usuarios.rol`);
 * la BD usa `is_app_admin()` para otro tipo de admin — pueden diferir; ver comentario en migración.
 */
export async function assertAccionEstadoTransition(
  prev: AccionDiaria,
  nextEstado: ActionStatus,
  mergedForHechoRules: AccionDiaria,
  closeHechoOptions?: CloseAccionValidationOptions
): Promise<void> {
  if (nextEstado === prev.estado) return

  const { usuario } = await resolveCurrentUsuarioForEstado()
  const meId = usuario?.id ?? null
  const bypass = usuario != null && isAdminByRole(usuario.rol)

  assertHechoVerificadoPermissions(prev, nextEstado, meId, bypass)

  if (nextEstado === 'Hecho') {
    await assertCanCloseAccionFromAccion(mergedForHechoRules, closeHechoOptions)
  }
}
