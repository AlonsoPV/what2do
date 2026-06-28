import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import type { AccionDiaria } from '@/types'
import {
  getAccionKanbanColumn,
  getAutoEstadoPorFechaCompromiso,
  getFechaCompromisoSlot,
  isEnRetraso,
} from './accionUtils'

/** 5 jun 2026, 11:34 PM Ciudad de México (UTC ya es 6 jun) */
const FIXED_NOW = new Date('2026-06-05T23:34:00-06:00')

function baseAccion(overrides: Partial<AccionDiaria> = {}): AccionDiaria {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    fecha: '2026-06-05',
    titulo_accion: 'Prueba',
    descripcion_accion: 'Descripcion de prueba suficientemente larga',
    responsable: '00000000-0000-4000-8000-000000000002',
    hora_limite: '17:00',
    evidencia_esperada: 'Evidencia',
    evidencia_cargada: false,
    evidencia_adjunta: null,
    estado: 'En_Pausa',
    kpi_afectado: null,
    tipo_accion: 'operativa',
    story_points: 0,
    prioridad: 'P2_Media',
    causa_raiz: null,
    responsable_bloqueo: null,
    escalado: false,
    fecha_escalamiento: null,
    notas_escalamiento: null,
    repeticion: false,
    verificador_dato: null,
    verificador_gobierno: null,
    okr_impactado: null,
    proceso: null,
    area: null,
    cliente_id: null,
    sprint_id: null,
    gap_id: null,
    catalog_kpi_id: null,
    created_at: '2026-06-05T10:00:00Z',
    updated_at: '2026-06-05T10:00:00Z',
    ...overrides,
  }
}

describe('accionUtils fecha compromiso CDMX', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    vi.stubEnv('VITE_DEV_FIXED_NOW', '')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('clasifica la fecha compromiso contra hoy en CDMX (no UTC)', () => {
    expect(getFechaCompromisoSlot('2026-06-04')).toBe('past')
    expect(getFechaCompromisoSlot('2026-06-05')).toBe('today')
    expect(getFechaCompromisoSlot('2026-06-06')).toBe('future')
  })

  it('marca retraso si la fecha compromiso ya paso o si hoy supero la hora limite', () => {
    expect(isEnRetraso(baseAccion({ fecha: '2026-06-04' }))).toBe(true)
    expect(isEnRetraso(baseAccion({ fecha: '2026-06-05', hora_limite: '17:00' }))).toBe(true)
    expect(isEnRetraso(baseAccion({ estado: 'Completada', fecha: '2026-06-04' }))).toBe(false)
  })

  it('no marca retraso el mismo dia antes de la hora limite', () => {
    vi.setSystemTime(new Date('2026-06-05T10:00:00-06:00'))
    expect(isEnRetraso(baseAccion({ fecha: '2026-06-05', hora_limite: '17:00' }))).toBe(false)
    expect(getAutoEstadoPorFechaCompromiso(baseAccion({ estado: 'En_Pausa' }))).toBeNull()
    expect(getAccionKanbanColumn(baseAccion({ fecha: '2026-06-05', hora_limite: '17:00' }))).toBe('En_Pausa')
  })

  it('promueve a Retrasa el mismo dia cuando la hora limite ya paso', () => {
    expect(getAutoEstadoPorFechaCompromiso(baseAccion({ estado: 'En_Pausa' }))).toBe('Retrasa')
    expect(getAutoEstadoPorFechaCompromiso(baseAccion({ estado: 'En_Proceso' }))).toBe('Retrasa')
  })

  it('promueve a Retrasa si la fecha compromiso es anterior', () => {
    expect(getAutoEstadoPorFechaCompromiso(baseAccion({ fecha: '2026-06-04', estado: 'En_Pausa' }))).toBe(
      'Retrasa'
    )
  })

  it('regresa a En_Pausa si la fecha compromiso es futura y estaba en Retrasa', () => {
    expect(
      getAutoEstadoPorFechaCompromiso(baseAccion({ fecha: '2026-06-06', estado: 'Retrasa' }))
    ).toBe('En_Pausa')
  })

  it('no mueve acciones completadas', () => {
    expect(getAutoEstadoPorFechaCompromiso(baseAccion({ estado: 'Completada' }))).toBeNull()
  })

  it('ubica en kanban segun fecha compromiso y hora limite', () => {
    expect(getAccionKanbanColumn(baseAccion({ fecha: '2026-06-04' }))).toBe('Retrasa')
    expect(getAccionKanbanColumn(baseAccion({ fecha: '2026-06-05', hora_limite: '17:00' }))).toBe('Retrasa')
    expect(getAccionKanbanColumn(baseAccion({ estado: 'En_Pausa', fecha: '2026-06-04' }))).toBe('Retrasa')
  })

  it('detecta fecha UTC erronea (2026-06-06) como futura en CDMX', () => {
    expect(getFechaCompromisoSlot('2026-06-06')).toBe('future')
    expect(getAccionKanbanColumn(baseAccion({ fecha: '2026-06-06', estado: 'En_Pausa' }))).toBe('En_Pausa')
  })
})
