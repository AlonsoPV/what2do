const CHUNK_RELOAD_KEY = 'tablero:chunk-reload'

const CHUNK_LOAD_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'Unable to preload CSS',
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

/** Recarga la página una vez; devuelve true si inició recarga. */
export function reloadOnceOnChunkError(): boolean {
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
    return true
  }

  clearChunkReloadFlag()
  return false
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
    if (isChunkLoadError(error) && reloadOnceOnChunkError()) {
      return new Promise<T>(() => {})
    }
    throw error
  }
}

/** Captura errores de chunk fuera de las rutas lazy (preload Vite, promesas no manejadas). */
export function registerChunkLoadRecovery(): void {
  window.addEventListener('vite:preloadError', () => {
    reloadOnceOnChunkError()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return
    event.preventDefault()
    reloadOnceOnChunkError()
  })
}
