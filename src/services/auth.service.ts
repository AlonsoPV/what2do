/**
 * Servicio de autenticación (Supabase Auth).
 *
 * Contratos:
 * - Sesión y tokens: solo vía `supabase.auth` (cliente anon en el navegador).
 * - Perfil de negocio: tabla `public.usuarios` vinculada a `auth.users.id`; nunca contraseñas en BD app.
 * - Alta: invitación admin → Edge Function `invite-user` + trigger `handle_new_user` (no registro público en UI).
 * - Cambio de contraseña autenticado: contraseña actual + `updateUser` (re-login interno en `changePassword`).
 */

import { supabase } from '@/lib/supabase/client'

const GENERIC_AUTH =
  'No pudimos iniciar sesión. Revisa correo y contraseña, o inténtalo de nuevo en un momento.'

/** Errores de inicio de sesión: tono tú, sin culpar; siguiente acción cuando aplica. */
export function mapAuthError(error: { message?: string }): string {
  const raw = error?.message ?? ''
  const msg = raw.toLowerCase()

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid_credentials') ||
    msg.includes('invalid_grant')
  ) {
    return 'Correo o contraseña no coinciden. Revisa mayúsculas o usa «¿Olvidaste tu contraseña?» en la pantalla de acceso.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Tu correo aún no está confirmado. Abre el enlace que te enviamos o pide a administración que reenvíe la invitación.'
  }
  if (msg.includes('user not found') || msg.includes('user does not exist')) {
    return 'No hay una cuenta con ese correo. Comprueba que sea el mismo que te dieron de alta o habla con administración.'
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'No hay conexión o el servicio no respondió. Revisa tu red e inténtalo otra vez.'
  }
  if (raw.trim()) return raw
  return GENERIC_AUTH
}

/** Recuperación y cambio de contraseña (flujos por correo). */
export function mapPasswordFlowError(error: { message?: string }): string {
  const raw = error?.message ?? ''
  const msg = raw.toLowerCase()
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Espera unos minutos antes de pedir otro enlace.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'No pudimos enviar el correo. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (raw.trim()) return raw
  return 'No se pudo completar el paso. Inténtalo de nuevo en un momento.'
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(mapAuthError(error))
    return data
  },

  async signUp(
    email: string,
    password: string,
    metadata: { nombre: string; rol?: string }
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /**
   * Envía un email para restablecer contraseña.
   * redirectTo: URL a la que Supabase redirige tras hacer clic en el enlace del correo.
   */
  async resetPasswordForEmail(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    if (error) throw new Error(mapPasswordFlowError(error))
  },

  getSession() {
    return supabase.auth.getSession()
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const { data: sessionData } = await supabase.auth.getSession()
    const email = sessionData?.session?.user?.email
    if (!email) throw new Error('Tu sesión caducó. Cierra sesión e inicia de nuevo.')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (signInError) {
      throw new Error(
        'La contraseña actual no coincide. Si no la recuerdas, cierra sesión y usa «¿Olvidaste tu contraseña?».'
      )
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) throw new Error(mapPasswordFlowError(updateError))
  },

  onAuthStateChange(
    callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
  ) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
