/**
 * Proveedor de autenticación.
 * Única fuente de verdad: sesión (Supabase), perfil (usuarios), usuario activo.
 *
 * Reglas del bootstrap:
 * - Siempre resolver a un estado final explícito: authenticated, signed_out, network_error,
 *   no_profile o user_inactive.
 * - Nunca dejar `isLoading` en true indefinidamente.
 * - Coordinar listener + fallback sin carreras: si una ejecución vieja termina tarde, se ignora.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { usuariosService } from '@/services/usuarios.service'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import type { AuthState, LoadAuthResult } from '../types/auth.types'
import { AuthStoreContext, type AuthStoreContextValue } from './auth-store-context'
export { useAuth } from '../hooks/useAuth'

const __DEV__ = import.meta.env.DEV
const CURRENT_USER_QUERY_KEY = ['users', 'current'] as const

/**
 * Límite de espera para resolver sesión con `getSession()` cuando no usamos el valor del listener.
 */
const SESSION_BOOTSTRAP_TIMEOUT_MS = 20000
/** Límite de espera para cargar perfil tras tener sesión válida. */
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 15000
/** Si el listener inicial no llega, dispara un fallback controlado de bootstrap. */
const INITIAL_AUTH_EVENT_FALLBACK_MS = 1500

function devLog(message: string, payload?: unknown) {
  if (!__DEV__) return
  if (payload === undefined) {
    console.log(`[auth] ${message}`)
    return
  }
  console.log(`[auth] ${message}`, payload)
}

function devWarn(message: string, payload?: unknown) {
  if (!__DEV__) return
  if (payload === undefined) {
    console.warn(`[auth] ${message}`)
    return
  }
  console.warn(`[auth] ${message}`, payload)
}

function getCurrentUserQueryKey(authUserId: string) {
  return [...CURRENT_USER_QUERY_KEY, authUserId] as const
}

/** Estado mientras se valida la sesión al montar (bootstrap). */
const LOADING_STATE: AuthState = {
  status: 'loading',
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isReady: false,
  error: null,
}

/** Estado tras cierre de sesión (explícito o SIGNED_OUT). Persistencia: Supabase limpia; no mostrar loader. */
const SIGNED_OUT_STATE: AuthState = {
  status: 'signed_out',
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isAuthenticated: false,
  isReady: true,
  error: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>(LOADING_STATE)
  const initialCheckDoneRef = useRef(false)
  const bootstrapRunIdRef = useRef(0)

  /**
   * Flujo central de bootstrap/refetch.
   * Siempre resuelve a un estado final, aunque falle la sesión, el perfil o el listener tarde.
   */
  const initializeAuth = useCallback(async (
    authEvent?: AuthChangeEvent,
    sessionFromListener?: Session | null
  ): Promise<LoadAuthResult> => {
    const runId = ++bootstrapRunIdRef.current
    const isInitial = !initialCheckDoneRef.current
    const useListenerSession = sessionFromListener !== undefined

    let session: Session | null = null
    let user: User | null = null

    const buildResult = (nextState: AuthState): LoadAuthResult => ({
      canEnterApp: nextState.status === 'authenticated',
      status: nextState.status,
      error: nextState.error,
    })

    const commitResolvedState = (nextState: AuthState, reason: string): LoadAuthResult => {
      const result = buildResult(nextState)
      if (runId !== bootstrapRunIdRef.current) {
        devWarn('stale bootstrap result ignored', { runId, latestRunId: bootstrapRunIdRef.current, reason })
        return result
      }

      initialCheckDoneRef.current = true

      if (user?.id && nextState.profile) {
        queryClient.setQueryData(getCurrentUserQueryKey(user.id), nextState.profile)
      } else if (nextState.status === 'signed_out') {
        queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      } else if (user?.id) {
        queryClient.removeQueries({ queryKey: getCurrentUserQueryKey(user.id), exact: true })
      }

      setState(nextState)
      devLog('bootstrap resolved', {
        reason,
        status: nextState.status,
        isAuthenticated: nextState.isAuthenticated,
        isReady: nextState.isReady,
        errorType: nextState.error?.type ?? null,
      })
      return result
    }

    const setBootstrapLoading = isInitial || authEvent === 'SIGNED_IN'
    if (setBootstrapLoading) {
      setState((s) => ({ ...s, isLoading: true, error: null, status: 'loading' }))
    }

    devLog('bootstrap start', {
      runId,
      authEvent: authEvent ?? 'manual',
      useListenerSession,
      isInitial,
    })

    try {
      if (useListenerSession) {
        session = sessionFromListener ?? null
        user = session?.user ?? null
        devLog('auth event', authEvent ?? 'listener')
      } else {
        devLog('loading session with getSession()')
        try {
          const res = await Promise.race([
            authService.getSession(),
            new Promise<never>((_, reject) => {
              window.setTimeout(
                () => reject(new Error('AUTH_SESSION_TIMEOUT')),
                SESSION_BOOTSTRAP_TIMEOUT_MS
              )
            }),
          ])
          session = res.data?.session ?? null
          user = session?.user ?? null
        } catch (err) {
          if (err instanceof Error && err.message === 'AUTH_SESSION_TIMEOUT') {
            devWarn('session timeout')
            return commitResolvedState(
              {
                status: 'network_error',
                session: null,
                user: null,
                profile: null,
                isLoading: false,
                isAuthenticated: false,
                isReady: true,
                error: {
                  type: 'network',
                  message:
                    'La comprobación tardó demasiado. Recarga la página. Si pasa a menudo, avisa a quien administra el sistema.',
                },
              },
              'session_timeout'
            )
          }
          throw err
        }
      }

      if (!session || !user) {
        devLog('no session')
        return commitResolvedState(SIGNED_OUT_STATE, 'signed_out')
      }

      devLog('session found', { userId: user.id })
      devLog('loading profile', { userId: user.id })

      let profile: Awaited<ReturnType<typeof usuariosService.getByAuthId>>
      try {
        profile = await Promise.race([
          usuariosService.getByAuthId(user.id),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error('AUTH_PROFILE_TIMEOUT')),
              PROFILE_BOOTSTRAP_TIMEOUT_MS
            )
          }),
        ])
      } catch (err) {
        devWarn('profile load error', err)
        const message =
          err instanceof Error && err.message === 'AUTH_PROFILE_TIMEOUT'
            ? 'No pudimos cargar tu ficha del tablero a tiempo. Revisa tu conexión y vuelve a intentarlo.'
            : 'No pudimos cargar tu ficha en el tablero. Revisa tu conexión y, si sigue igual, avisa a quien administra el sistema.'

        return commitResolvedState(
          {
            status: 'network_error',
            session,
            user,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            isReady: false,
            error: {
              type: 'network',
              message,
            },
          },
          'profile_network_error'
        )
      }

      if (!profile) {
        devWarn('no profile', { userId: user.id })
        return commitResolvedState(
          {
            status: 'no_profile',
            session,
            user,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            isReady: false,
            error: {
              type: 'no_profile',
              message:
                'Tu acceso existe, pero aún no tienes ficha en el tablero: sin ella no podemos asignarte rol ni permisos. Pide a un administrador que te dé de alta en Usuarios o que revise tu correo.',
            },
          },
          'no_profile'
        )
      }

      if (!profile.activo) {
        devWarn('inactive user', { userId: user.id })
        return commitResolvedState(
          {
            status: 'user_inactive',
            session,
            user,
            profile,
            isLoading: false,
            isAuthenticated: true,
            isReady: false,
            error: {
              type: 'user_inactive',
              message:
                'Tu cuenta está desactivada: no puedes entrar al tablero hasta que un administrador la vuelva a activar.',
            },
          },
          'user_inactive'
        )
      }

      devLog('profile loaded', { userId: user.id, profileId: profile.id })
      return commitResolvedState(
        {
          status: 'authenticated',
          session,
          user,
          profile,
          isLoading: false,
          isAuthenticated: true,
          isReady: true,
          error: null,
        },
        'authenticated'
      )
    } catch (err) {
      devWarn('network error', err)
      return commitResolvedState(
        {
          status: 'network_error',
          session,
          user,
          profile: null,
          isLoading: false,
          isAuthenticated: Boolean(session && user),
          isReady: false,
          error: {
            type: 'network',
            message:
              'No pudimos comprobar la sesión. Revisa tu conexión y, si estás dentro de la app, pulsa Reintentar.',
          },
        },
        'unexpected_error'
      )
    }
  }, [queryClient])

  const logout = useCallback(async () => {
    devLog('logout manual')
    setState(SIGNED_OUT_STATE)
    try {
      await authService.signOut()
    } catch {
      // Ignorar error de signOut; sesión puede estar ya invalidada
    } finally {
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
  }, [queryClient])

  useEffect(() => {
    // El listener es la fuente principal del primer estado; si no llega, usamos fallback controlado.
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      await initializeAuth(event, session)
    })

    // Fallback: si el evento inicial no llega, evita loader infinito.
    const fallbackId = window.setTimeout(() => {
      if (initialCheckDoneRef.current) return
      devWarn('fallback bootstrap: initial auth event did not arrive, using getSession()')
      void initializeAuth()
    }, INITIAL_AUTH_EVENT_FALLBACK_MS)

    return () => {
      window.clearTimeout(fallbackId)
      subscription.unsubscribe()
    }
  }, [initializeAuth])

  const value: AuthStoreContextValue = {
    ...state,
    logout,
    refetch: (authEvent) => initializeAuth(authEvent),
  }

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>
}
