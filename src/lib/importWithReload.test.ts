import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from './importWithReload'

describe('isChunkLoadError', () => {
  it('detecta error de chunk de Vite/React Router', () => {
    const error = new TypeError(
      'Failed to fetch dynamically imported module: https://example.com/assets/KanbanPage-abc.js'
    )
    expect(isChunkLoadError(error)).toBe(true)
  })

  it('detecta error de Safari', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true)
  })

  it('ignora otros errores', () => {
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })
})
