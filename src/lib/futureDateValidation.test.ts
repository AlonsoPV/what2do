import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isFutureDateTimeCDMX,
  isTodayOrFutureDateCDMX,
  splitDateTimeLocal,
  validateFutureDateTimeCDMX,
  validateFutureInstant,
  validateTodayOrFutureDateCDMX,
} from './futureDateValidation'

describe('futureDateValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T10:30:00-06:00'))
    vi.stubEnv('VITE_DEV_FIXED_NOW', '')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('exige fecha y hora posteriores al momento de creacion en CDMX', () => {
    expect(isFutureDateTimeCDMX('2026-06-15', '10:29')).toBe(false)
    expect(isFutureDateTimeCDMX('2026-06-15', '10:30')).toBe(false)
    expect(isFutureDateTimeCDMX('2026-06-15', '10:31')).toBe(true)
    expect(isFutureDateTimeCDMX('2026-06-16', '00:00')).toBe(true)
  })

  it('valida fechas de elementos sin hora como hoy o futuras', () => {
    expect(isTodayOrFutureDateCDMX('2026-06-14')).toBe(false)
    expect(isTodayOrFutureDateCDMX('2026-06-15')).toBe(true)
    expect(isTodayOrFutureDateCDMX('2026-06-16')).toBe(true)
  })

  it('devuelve mensajes operativos para formularios', () => {
    expect(validateFutureDateTimeCDMX('2026-06-15', '10:30', 'La fecha y hora')).toBe(
      'La fecha y hora debe quedar despues del momento de creacion.'
    )
    expect(validateFutureDateTimeCDMX('2026-06-15', '10:31', 'La fecha y hora')).toBeNull()
    expect(validateTodayOrFutureDateCDMX('2026-06-14', 'La fecha del elemento')).toBe(
      'La fecha del elemento debe ser hoy o una fecha posterior.'
    )
  })

  it('valida instantes ISO guardados en servicios', () => {
    expect(validateFutureInstant('2026-06-15T16:30:00.000Z', 'La fecha y hora')).toBe(
      'La fecha y hora debe quedar despues del momento de creacion.'
    )
    expect(validateFutureInstant('2026-06-15T16:31:00.000Z', 'La fecha y hora')).toBeNull()
  })

  it('separa datetime-local en fecha y hora', () => {
    expect(splitDateTimeLocal('2026-06-15T11:45')).toEqual({ date: '2026-06-15', time: '11:45' })
    expect(splitDateTimeLocal('')).toBeNull()
  })
})
