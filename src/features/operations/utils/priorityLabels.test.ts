import { describe, expect, it } from 'vitest'
import { priorityDisplayLabel } from './priorityLabels'

describe('priorityDisplayLabel', () => {
  it('uses the catalog name exactly as the visible action priority label', () => {
    expect(priorityDisplayLabel('P1_Critica')).toBe('P1_Critica')
    expect(priorityDisplayLabel('Alta Direccion')).toBe('Alta Direccion')
  })

  it('keeps empty values readable without deriving a label from description', () => {
    expect(priorityDisplayLabel('')).toBe('Sin prioridad')
  })
})
