/**
 * Validación al cambiar `estado` en acciones_diarias: permisos Completada
 * y reglas de cierre (checklist activo).
 */

import {
  assertCanCloseAccionFromAccion,
  type CloseAccionValidationOptions,
} from '@/services/accionCloseValidation.service'
import { usuariosService } from '@/services/usuarios.service'
import { supabase } from '@/lib/supabase/client'
import { isAdminByRole } from '@/features/auth/lib/permissions'
import { MSJ_PERMISO_COMPLETADA } from '@/features/operations/utils/actionPermissions'
import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types'

async function resolveCurrentUsuarioForEstado() {
  const { data: auth } = await supabase.auth.getUser()
  const authId = auth.user?.id
  if (!authId) return { usuario: null as Awaited<ReturnType<typeof usuariosService.getByAuthId>> }
  const usuario = await usuariosService.getByAuthId(authId)
  return { usuario }
}

function assertCompletadaPermissions(
  prev: AccionDiaria,
  nextEstado: ActionStatus,
  currentUsuarioId: string | null,
  bypassByBusinessRole: boolean
): void {
  if (nextEstado === prev.estado) return
  if (bypassByBusinessRole) return
  if (nextEstado === 'Completada') {
    const ok =
      !!currentUsuarioId &&
      (prev.responsable === currentUsuarioId ||
        (prev.created_by != null && prev.created_by === currentUsuarioId))
    if (!ok) throw new Error(MSJ_PERMISO_COMPLETADA)
  }
}

/**
 * Lanza Error con mensaje claro si el cambio de estado no está permitido
 * o no cumple cierre a Completada (checkpoints pendientes).
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

  assertCompletadaPermissions(prev, nextEstado, meId, bypass)

  if (nextEstado === 'Completada') {
    await assertCanCloseAccionFromAccion(mergedForHechoRules, closeHechoOptions)
  }
}
