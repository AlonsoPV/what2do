import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccionDiaria } from '@/types'
import type { AccionComentario } from '@/types/accionComentario'
import {
  ACTION_GAMIFICATION_POINTS,
  buildActionGamificationMetrics,
  getUserOwnedActions,
} from './actionGamification'

const USER_ID = 'user-1'
const OTHER_ID = 'user-2'
const FIXED_NOW = new Date('2026-06-05T23:34:00-06:00')

function accion(overrides: Partial<AccionDiaria> = {}): AccionDiaria {
  return {
    id: overrides.id ?? 'accion-1',
    fecha: '2026-06-05',
    titulo_accion: 'Accion de prueba',
    descripcion_accion: 'Descripcion de prueba',
    responsable: OTHER_ID,
    created_by: OTHER_ID,
    updated_by: null,
    hora_limite: '17:00',
    evidencia_esperada: 'Evidencia',
    evidencia_cargada: false,
    evidencia_adjunta: null,
    estado: 'Pendiente',
    kpi_afectado: null,
    gap_id: null,
    tipo_accion: 'operativa',
    story_points: 0,
    catalog_kpi_id: null,
    okr_impactado: null,
    proceso: null,
    area: null,
    cliente_id: null,
    prioridad: 'P2_Media',
    causa_raiz: null,
    responsable_bloqueo: null,
    escalado: false,
    fecha_escalamiento: null,
    notas_escalamiento: null,
    repeticion: false,
    verificador_dato: null,
    verificador_gobierno: null,
    completed_at: null,
    completed_by: null,
    verified_at: null,
    verified_by: null,
    created_at: '2026-06-05T10:00:00Z',
    updated_at: '2026-06-05T10:00:00Z',
    sprint_id: null,
    ...overrides,
  }
}

function comentario(overrides: Partial<AccionComentario> = {}): AccionComentario {
  return {
    id: overrides.id ?? 'comentario-1',
    accion_id: overrides.accion_id ?? 'accion-1',
    contenido: 'Seguimiento',
    created_by: OTHER_ID,
    asignado: USER_ID,
    etiquetas: [USER_ID],
    adjuntos: [],
    created_at: '2026-06-05T11:00:00Z',
    ...overrides,
  }
}

describe('actionGamification', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    vi.stubEnv('VITE_DEV_FIXED_NOW', '')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('muestra acciones etiquetadas como visibles sin penalizarlas como retraso directo', () => {
    const taggedOverdue = accion({ id: 'tagged-overdue', responsable: OTHER_ID, created_by: OTHER_ID })
    const comments = [comentario({ accion_id: taggedOverdue.id })]
    const personalActions = getUserOwnedActions(USER_ID, [taggedOverdue], comments)

    const metrics = buildActionGamificationMetrics(USER_ID, personalActions, comments, '2026-06-05')

    expect(personalActions).toHaveLength(1)
    expect(metrics.taggedActions).toBe(1)
    expect(metrics.overdue).toBe(0)
    expect(metrics.rules.find((rule) => rule.key === 'overdue')?.points).toBe(0)
  })

  it('penaliza retrasos creados por el usuario o asignados al usuario con la misma regla del Kanban', () => {
    const assignedOverdue = accion({ id: 'assigned-overdue', responsable: USER_ID, created_by: OTHER_ID })
    const createdOverdue = accion({ id: 'created-overdue', responsable: OTHER_ID, created_by: USER_ID })
    const comments: AccionComentario[] = []
    const personalActions = getUserOwnedActions(USER_ID, [assignedOverdue, createdOverdue], comments)

    const metrics = buildActionGamificationMetrics(USER_ID, personalActions, comments, '2026-06-05')

    expect(metrics.overdue).toBe(2)
    expect(metrics.rules.find((rule) => rule.key === 'overdue')?.points).toBe(
      2 * ACTION_GAMIFICATION_POINTS.overdue
    )
  })
})
