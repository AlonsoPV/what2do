/**
 * Cliente HTTP para Edge Functions de IA O2C.
 * Igual que distancias: JWT de sesión + apikey anon; no expone secretos Lovable en el navegador.
 */

import { supabase, SUPABASE_URL } from '@/lib/supabase/client'

export async function getAiInvocationHeaders(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    throw new Error(
      'Debes iniciar sesión para usar el asistente IA. Cierra sesión y vuelve a entrar si el problema persiste.'
    )
  }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (anonKey) headers.apikey = anonKey
  return headers
}

export function getAiFunctionsBaseUrl(): string {
  const base = SUPABASE_URL?.replace(/\/$/, '') ?? ''
  if (!base || base === 'undefined') {
    throw new Error('VITE_SUPABASE_URL no está configurada.')
  }
  return `${base}/functions/v1`
}

/**
 * Reintentos ante 429/503 (§8.2 docs/ia.md).
 */
export async function fetchAiWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, options)
      if (resp.status === 429 || resp.status === 503) {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)))
          continue
        }
      }
      return resp
    } catch (err) {
      lastError = err
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudo contactar el servicio de IA')
}

export async function readAiErrorJSON(resp: Response): Promise<string | null> {
  try {
    const j = (await resp.clone().json()) as { error?: string; message?: string }
    const m = typeof j.error === 'string' ? j.error : typeof j.message === 'string' ? j.message : null
    return m
  } catch {
    try {
      return await resp.clone().text()
    } catch {
      return null
    }
  }
}
