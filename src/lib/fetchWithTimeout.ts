/**
 * Fetch con tiempo máximo de espera (AbortController).
 * Combina la señal del caller con el timeout para no perder aborts de Supabase/React Query.
 */

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const out = new AbortController()
  const abortWith = (reason?: unknown) => {
    try {
      if (!out.signal.aborted) out.abort(reason as never)
    } catch {
      // noop
    }
  }
  if (a.aborted) {
    abortWith(a.reason)
    return out.signal
  }
  if (b.aborted) {
    abortWith(b.reason)
    return out.signal
  }
  a.addEventListener('abort', () => abortWith(a.reason), { once: true })
  b.addEventListener('abort', () => abortWith(b.reason), { once: true })
  return out.signal
}

function resolveFetchTimeoutMs(): number {
  const raw = import.meta.env.VITE_FETCH_TIMEOUT_MS
  if (raw === undefined || raw === '') return 15_000
  const n = Number(raw)
  return Number.isFinite(n) && n >= 3000 ? n : 15_000
}

/** Timeout por defecto ~15s; override con `VITE_FETCH_TIMEOUT_MS` (ms, mínimo 3000). */
export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ms = resolveFetchTimeoutMs()
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort(new DOMException('La solicitud tardó demasiado', 'AbortError'))
  }, ms)

  const userSignal = init?.signal
  const signal = userSignal ? mergeAbortSignals(controller.signal, userSignal) : controller.signal

  return fetch(input, { ...init, signal }).finally(() => window.clearTimeout(timeoutId))
}
