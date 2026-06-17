import { describe, expect, it } from 'vitest'
import type { Priority } from '@/features/catalogs/types/catalogs.types'
import {
  findPriorityForAccion,
  resolveAccionPrioridadNombre,
} from './resolveAccionPrioridad'

const priorities: Priority[] = [
  {
    id: 'p1',
    nombre: 'Crítica',
    descripcion: null,
    color: '#f00',
    orden: 1,
    activo: true,
    created_at: '',
    updated_at: '',
  },
]

describe('resolveAccionPrioridad', () => {
  it('resuelve por prioridad_id aunque el texto esté desfasado', () => {
    const accion = { prioridad: 'P1_Critica', prioridad_id: 'p1' }
    expect(resolveAccionPrioridadNombre(accion, priorities)).toBe('Crítica')
    expect(findPriorityForAccion(accion, priorities)?.id).toBe('p1')
  })

  it('resuelve por nombre cuando no hay id', () => {
    const accion = { prioridad: 'Crítica' }
    expect(resolveAccionPrioridadNombre(accion, priorities)).toBe('Crítica')
  })

  it('conserva texto legacy si no hay match en catálogo', () => {
    const accion = { prioridad: 'P1_Critica' }
    expect(resolveAccionPrioridadNombre(accion, priorities)).toBe('P1_Critica')
  })
})
