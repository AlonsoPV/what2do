import { useMemo } from 'react'
import { isAdminByRole, isAnalystByRole } from '@/features/auth/lib/permissions'
import type { AccionDiaria } from '@/types'
import type { ActionStatus } from '@/types'
import {
  canChangeAccionEstado,
  getAccionEstadoChangeDenialMessage,
} from '../utils/actionPermissions'

/**
 * Permisos de cambio de estado Hecho/Verificado para el usuario actual (usuarios.id).
 * DG/Sistemas omiten la regla creador/responsable en UI (alineado con accionEstadoValidation.service).
 */
export function useActionEstadoPermissions(
  currentUser: { id: string; rol: string } | null | undefined
) {
  const bypassEstadoRoles = currentUser ? isAdminByRole(currentUser.rol) : false
  const readOnly = currentUser ? isAnalystByRole(currentUser.rol) : false
  const uid = currentUser?.id

  return useMemo(
    () => ({
      canChangeTo: (accion: AccionDiaria, target: ActionStatus) =>
        !readOnly &&
        canChangeAccionEstado(accion, uid, target, { bypassEstadoRoles }),
      denialMessage: (accion: AccionDiaria, target: ActionStatus) =>
        readOnly
          ? 'El rol Analista solo puede visualizar sus acciones.'
          : getAccionEstadoChangeDenialMessage(accion, uid, target, { bypassEstadoRoles }),
    }),
    [uid, bypassEstadoRoles, readOnly]
  )
}
