import { createClient, type User } from '@supabase/supabase-js'
import { jsonResponse } from './cors.ts'

export type RequireUserOk = { user: User; token: string }
export type RequireUserResult =
  | { ok: true; data: RequireUserOk }
  | { ok: false; response: Response }

/**
 * Valida Bearer JWT contra Supabase Auth (service role), sin usar verify_jwt del gateway.
 */
export async function requireAuthUser(req: Request): Promise<RequireUserResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Configuración de servidor incompleta' }, 500),
    }
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: jsonResponse({ error: 'No autorizado' }, 401),
    }
  }

  const token = authHeader.slice(7)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !userData.user) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Sesión inválida' }, 401),
    }
  }

  return {
    ok: true,
    data: { user: userData.user, token },
  }
}
