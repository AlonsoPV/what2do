import { describe, expect, it } from 'vitest'
import type { AccionDiaria } from '@/types'
import {
  buildAccionGapIdsMap,
  buildImpactRowsFromAcciones,
  buildTotalPtsByGap,
} from './impactMatrixRows'

function accion(partial: Partial<AccionDiaria> & { id: string }): AccionDiaria {
  return {
    fecha: '2026-06-01',
    titulo_accion: 'Acción test',
    descripcion_accion: 'Desc',
    responsable: 'u1',
    hora_limite: '17:00',
    evidencia_esperada: 'doc',
    evidencia_cargada: false,
    evidencia_adjunta: null,
    estado: 'En_Pausa',
    kpi_afectado: null,
    tipo_accion: 'operativa',
    story_points: 5,
    prioridad: 'Media',
    escalado: false,
    repeticion: false,
    ...partial,
  } as AccionDiaria
}

describe('buildAccionGapIdsMap', () => {
  it('incluye gap_id de columna y vínculos por accion_gaps', () => {
    const acciones = [accion({ id: 'a1', gap_id: 'g1' }), accion({ id: 'a2', gap_id: null })]
    const junction = new Map<string, Set<string>>([['g2', new Set(['a2'])]])
    const map = buildAccionGapIdsMap(acciones, junction)
    expect([...(map.get('a1') ?? [])]).toEqual(['g1'])
    expect([...(map.get('a2') ?? [])]).toEqual(['g2'])
  })
})

describe('buildImpactRowsFromAcciones', () => {
  it('lista acciones con story points aunque no tengan gap', () => {
    const acciones = [accion({ id: 'a1', story_points: 8, gap_id: null })]
    const rows = buildImpactRowsFromAcciones({
      acciones,
      accionGapIds: buildAccionGapIdsMap(acciones, new Map()),
      gapById: new Map(),
      kpiByGapId: new Map(),
      totalPtsByGap: buildTotalPtsByGap(acciones, new Map()),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].storyPoints).toBe(8)
    expect(rows[0].gapId).toBeNull()
  })

  it('calcula impacto para acción vinculada solo por accion_gaps', () => {
    const acciones = [accion({ id: 'a1', gap_id: null, story_points: 5 })]
    const junction = new Map<string, Set<string>>([['g1', new Set(['a1'])]])
    const accionGapIds = buildAccionGapIdsMap(acciones, junction)
    const gapById = new Map([
      ['g1', { id: 'g1', nombre: 'Gap 1', total_story_points: 10 }],
    ])
    const kpiByGapId = new Map([['g1', { nombre: 'KPI 1', weight: 0.2 }]])
    const totalPtsByGap = buildTotalPtsByGap(acciones, accionGapIds)

    const rows = buildImpactRowsFromAcciones({
      acciones,
      accionGapIds,
      gapById,
      kpiByGapId,
      totalPtsByGap,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].gapNombre).toBe('Gap 1')
    expect(rows[0].impactoPct).toBeCloseTo(0.2, 5)
  })

  it('omite acciones cuyos gaps ya no están en el catálogo activo', () => {
    const acciones = [accion({ id: 'a1', gap_id: null, story_points: 5 })]
    const junction = new Map<string, Set<string>>([['g-inactivo', new Set(['a1'])]])
    const accionGapIds = buildAccionGapIdsMap(acciones, junction)

    const rows = buildImpactRowsFromAcciones({
      acciones,
      accionGapIds,
      gapById: new Map(),
      kpiByGapId: new Map(),
      totalPtsByGap: buildTotalPtsByGap(acciones, accionGapIds),
    })

    expect(rows).toHaveLength(0)
    expect(rows.every((row) => row != null)).toBe(true)
  })
})
