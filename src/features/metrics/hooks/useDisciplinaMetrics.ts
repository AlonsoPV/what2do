/**
 * Métricas de disciplina por usuario y fecha.
 * Usa medicion_disciplina si existe; si no, calcula desde acciones (TODO: cálculo automático en BD).
 */

import { useQuery } from '@tanstack/react-query'
import { disciplinaService } from '@/services/disciplina.service'
import { accionesService } from '@/services/acciones.service'
import type { MedicionDisciplina } from '@/types'
import { accionComentariosService } from '@/services/accionComentarios.service'
import type { AccionComentario } from '@/types/accionComentario'

export interface DisciplinaMetrics extends MedicionDisciplina {
  /** true si se calculó desde acciones por no haber fila en medicion_disciplina */
  fromFallback?: boolean
}

function computeFromAcciones(
  acciones: { id?: string; estado: string; evidencia_cargada: boolean; responsable?: string | null; created_by?: string | null }[],
  usuarioId: string,
  fecha: string,
  comentarios: AccionComentario[] = []
): DisciplinaMetrics {
  const taggedActionIds = new Set(
    comentarios
      .filter((comment) => comment.asignado === usuarioId || comment.etiquetas?.includes(usuarioId))
      .map((comment) => comment.accion_id)
  )
  const accionesUsuario = [
    ...new Map(
      acciones
        .filter((a) => a.responsable === usuarioId || a.created_by === usuarioId || taggedActionIds.has(a.id ?? ''))
        .map((a, index) => [a.id ?? String(index), a])
    ).values(),
  ]
  const asignadas = accionesUsuario.length
  const cerradasConEvidencia = accionesUsuario.filter(
    (a) =>
      (a.estado === 'Hecho' || a.estado === 'Verificado') && a.evidencia_cargada
  ).length
  const sinEvidencia = accionesUsuario.filter(
    (a) =>
      (a.estado === 'Hecho' || a.estado === 'Verificado') && !a.evidencia_cargada
  ).length
  const porcentaje =
    asignadas > 0 ? Math.round((cerradasConEvidencia / asignadas) * 1000) / 10 : 0

  return {
    id: '',
    usuario_id: usuarioId,
    fecha,
    acciones_asignadas: asignadas,
    acciones_cerradas_en_tiempo: cerradasConEvidencia,
    porcentaje_cumplimiento: porcentaje,
    acciones_sin_evidencia: sinEvidencia,
    reincidencias: 0,
    dias_consecutivos_en_verde: 0,
    fromFallback: true,
  }
}

const KEY = ['disciplina'] as const

export function useDisciplinaMetrics(usuarioId: string | undefined, fecha: string) {
  return useQuery({
    queryKey: [...KEY, usuarioId, fecha],
    queryFn: async (): Promise<DisciplinaMetrics> => {
      if (!usuarioId || !fecha) {
        return computeFromAcciones([], usuarioId ?? '', fecha)
      }
      const [medicion, acciones] = await Promise.all([
        disciplinaService.getByUsuarioAndFecha(usuarioId, fecha),
        accionesService.list({
          fecha_creacion: fecha,
        }),
      ])
      const comentarios =
        acciones.length > 0 ? await accionComentariosService.listByAccionIds(acciones.map((accion) => accion.id)) : []
      const liveMetrics = computeFromAcciones(acciones, usuarioId, fecha, comentarios)
      if (medicion) {
        return {
          ...medicion,
          acciones_asignadas: liveMetrics.acciones_asignadas,
          acciones_cerradas_en_tiempo: liveMetrics.acciones_cerradas_en_tiempo,
          porcentaje_cumplimiento: liveMetrics.porcentaje_cumplimiento,
          acciones_sin_evidencia: liveMetrics.acciones_sin_evidencia,
          fromFallback: false,
        }
      }
      return liveMetrics
    },
    enabled: !!usuarioId && !!fecha,
  })
}
