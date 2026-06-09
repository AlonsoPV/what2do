const CHUNK_RELOAD_KEY = 'tablero:chunk-reload'

const CHUNK_LOAD_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
] as const

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    // sessionStorage puede no estar disponible
  }
}

/**
 * Envuelve import() dinámico: si falla por chunk obsoleto tras un deploy, recarga una vez.
 */
export async function importWithReload<T>(importer: () => Promise<T>): Promise<T> {
  try {
    const result = await importer()
    clearChunkReloadFlag()
    return result
  } catch (error) {
    if (!isChunkLoadError(error)) throw error

    let alreadyReloaded = false
    try {
      alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1'
    } catch {
      // ignore
    }

    if (!alreadyReloaded) {
      try {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      } catch {
        // ignore
      }
      window.location.reload()
      return new Promise<T>(() => {})
    }

    clearChunkReloadFlag()
    throw error
  }
}
