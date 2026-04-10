import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    'Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidos. En Vercel: Settings → Environment Variables (Production) y nuevo deploy.'
  if (import.meta.env.PROD) {
    console.error(msg)
  } else {
    console.warn(msg)
  }
}

/** URL del proyecto Supabase (misma que usa auth). Úsala para Edge Functions. */
export const SUPABASE_URL = supabaseUrl ?? ''

/**
 * Cliente browser: sesión en localStorage, refresh automático.
 * `detectSessionInUrl` procesa enlaces mágicos / recovery en la URL.
 * No forzar `flowType: 'pkce'`: en algunos entornos provoca que `getSession()` no termine en el bootstrap.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
