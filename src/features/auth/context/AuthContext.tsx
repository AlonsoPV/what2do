/**
 * Proveedor de autenticación.
 * Única fuente de verdad: sesión (Supabase), perfil (usuarios), usuario activo.
 *
 * Reglas del bootstrap:
 * - Resolver primero la sesión y después el perfil.
 * - Nunca dejar `authLoading` activo indefinidamente.
 * - Separar explícitamente `sessionStatus` y `profileStatus`.
 * - Coordinar listener + fallback sin carreras: si una ejecución vieja termina tarde, se ignora.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { usuariosService } from '@/services/usuarios.service'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import type { AuthError, AuthProfileStatus, AuthSessionStatus, AuthState, LoadAuthResult } from '../types/auth.types'
import { AuthStoreContext, type AuthStoreContextValue } from './auth-store-context'
export { useAuth } from '../hooks/useAuth'

const __DEV__ = import.meta.env.DEV
const CURRENT_USER_QUERY_KEY = ['users', 'current'] as const
const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Por favor inicia sesión nuevamente.'

/** Límite de espera para resolver sesión con `getSession()` cuando no usamos el valor del listener. */
const SESSION_BOOTSTRAP_TIMEOUT_MS = 20000
/** Límite de espera para cargar perfil tras tener sesión válida. */
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 15000
/** Si el listener inicial no llega, dispara un fallback controlado de bootstrap. */
const INITIAL_AUTH_EVENT_FALLBACK_MS = 250
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return ''
}

function isInvalidRefreshTokenError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found')
  )
}

function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return

  const keysToRemove = new Set<string>()
  const shouldRemoveKey = (key: string) =>
    key === 'supabase.auth.token' ||
    (key.startsWith('sb-') &&
      (key.includes('-auth-token') || key.includes('-code-verifier')))

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key && shouldRemoveKey(key)) {
        keysToRemove.add(key)
      }
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  }
}

function deriveStatus(
  sessionStatus: AuthSessionStatus,
  profileStatus: AuthProfileStatus
): AuthState['status'] {
  if (sessionStatus === 'loading') return 'loading'
  if (sessionStatus === 'signed_out') return 'signed_out'
  if (profileStatus === 'loaded') return 'authenticated'
  if (profileStatus === 'no_profile') return 'no_profile'
  if (profileStatus === 'inactive') return 'user_inactive'
  if (profileStatus === 'timeout') return 'profile_timeout'
  if (profileStatus === 'network_error') return 'profile_network_error'
  return 'loading'
}

function buildAuthState({
  sessionStatus,
  profileStatus,
  session = null,
  user = null,
  profile = null,
  error = null,
}: {
  sessionStatus: AuthSessionStatus
  profileStatus: AuthProfileStatus
  session?: Session | null
  user?: User | null
  profile?: AuthState['profile']
  error?: AuthError | null
}): AuthState {
  const authLoading = sessionStatus === 'loading'
  const isAuthenticated = sessionStatus === 'authenticated'
  const isReady = isAuthenticated && profileStatus === 'loaded'

  return {
    status: deriveStatus(sessionStatus, profileStatus),
    authLoading,
    authResolved: !authLoading,
    sessionStatus,
    profileStatus,
    isLoading: authLoading,
    session,
    user,
    profile,
    isAuthenticated,
    isReady,
    error,
  }
}

const LOADING_STATE = buildAuthState({
  sessionStatus: 'loading',
  profileStatus: 'idle',
})

const SIGNED_OUT_STATE = buildAuthState({
  sessionStatus: 'signed_out',
  profileStatus: 'idle',
})

function buildSignedOutState(error: AuthError | null = null) {
  return buildAuthState({
    sessionStatus: 'signed_out',
    profileStatus: 'idle',
    error,
  })
}

function buildProfileLoadingState(session: Session, user: User) {
  return buildAuthState({
    sessionStatus: 'authenticated',
    profileStatus: 'loading',
    session,
    user,
  })
}

function buildProfileTimeoutState(session: Session, user: User) {
  return buildAuthState({
    sessionStatus: 'authenticated',
    profileStatus: 'timeout',
    session,
    user,
    error: {
      type: 'timeout',
      message:
        'Pudimos validar tu sesión, pero no fue posible cargar tu perfil a tiempo. Intenta nuevamente.',
    },
  })
}

function buildProfileNetworkErrorState(session: Session, user: User) {
  return buildAuthState({
    sessionStatus: 'authenticated',
    profileStatus: 'network_error',
    session,
    user,
    error: {
      type: 'network',
      message:
        'Pudimos validar tu sesión, pero no fue posible cargar tu perfil. Intenta nuevamente.',
    },
  })
}

function buildNoProfileState(session: Session, user: User) {
  return buildAuthState({
    sessionStatus: 'authenticated',
    profileStatus: 'no_profile',
    session,
    user,
    error: {
      type: 'no_profile',
      message:
        'Tu acceso existe, pero aún no tienes ficha en el tablero: sin ella no podemos asignarte rol ni permisos. Pide a un administrador que te dé de alta en Usuarios o que revise tu correo.',
    },
  })
}

function buildInactiveState(session: Session, user: User, profile: NonNullable<AuthState['profile']>) {
  return buildAuthState({
    sessionStatus: 'authenticated',
    profileStatus: 'inactive',
    session,
    user,
    profile,
    error: {
      type: 'user_inactive',
      message:
        'Tu cuenta está desactivada: no puedes entrar al tablero hasta que un administrador la vuelva a activar.',
    },
  })
}

function buildAuthenticatedState(session: Session, user: User, profile: NonNullable<AuthState['profile']>) {
  return buildAuthState({
    sessionStatus: 'authenticated',
    profileStatus: 'loaded',
    session,
    user,
    profile,
  })
}

function buildSessionNetworkErrorState(message: string) {
  return buildAuthState({
    sessionStatus: 'signed_out',
    profileStatus: 'idle',
    error: {
      type: 'network',
      message,
    },
  })
}

function buildResult(nextState: AuthState): LoadAuthResult {
  return {
    canEnterApp: nextState.status === 'authenticated',
    status: nextState.status,
    sessionStatus: nextState.sessionStatus,
    profileStatus: nextState.profileStatus,
    error: nextState.error,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>(LOADING_STATE)
  const initialCheckDoneRef = useRef(false)
  const bootstrapRunIdRef = useRef(0)
  const initialBootstrapPromiseRef = useRef<Promise<LoadAuthResult> | null>(null)
  const isMountedRef = useRef(false)
  const authEventTimersRef = useRef<number[]>([])
  /** Tras un bootstrap exitoso (sesión + perfil listo). Sirve para ignorar SIGNED_IN duplicados (p. ej. refresh). */
  const lastFullyAuthenticatedUserIdRef = useRef<string | null>(null)

  const initializeAuth = useCallback((
    authEvent?: AuthChangeEvent,
    sessionFromListener?: Session | null
  ): Promise<LoadAuthResult> => {
    const isInitialBootstrap = !initialCheckDoneRef.current
    if (isInitialBootstrap && initialBootstrapPromiseRef.current) {
      devLog('initial bootstrap already in flight, reusing promise', {
        authEvent: authEvent ?? 'manual',
      })
      return initialBootstrapPromiseRef.current
    }

    const bootstrapPromise = (async () => {
      const runId = ++bootstrapRunIdRef.current
      const useListenerSession = sessionFromListener !== undefined
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()

      let session: Session | null = null
      let user: User | null = null

      const commitState = (nextState: AuthState, reason: string): LoadAuthResult => {
        const result = buildResult(nextState)
        const elapsedMs = Math.round(
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
        )

        if (runId !== bootstrapRunIdRef.current) {
          devWarn('stale bootstrap ignored', { runId, latestRunId: bootstrapRunIdRef.current, reason, elapsedMs })
          return result
        }

        initialCheckDoneRef.current = true

        if (nextState.sessionStatus === 'signed_out') {
          lastFullyAuthenticatedUserIdRef.current = null
        } else if (nextState.status === 'authenticated' && nextState.user?.id) {
          lastFullyAuthenticatedUserIdRef.current = nextState.user.id
        }

        if (nextState.user?.id && nextState.profile) {
          queryClient.setQueryData(getCurrentUserQueryKey(nextState.user.id), nextState.profile)
        } else if (nextState.sessionStatus === 'signed_out') {
          queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })
        } else if (nextState.user?.id) {
          queryClient.removeQueries({ queryKey: getCurrentUserQueryKey(nextState.user.id), exact: true })
        }

        if (!isMountedRef.current) {
          devWarn('bootstrap result ignored after unmount', { runId, reason })
          return result
        }

        setState(nextState)
        devLog('bootstrap resolved', {
          reason,
          status: nextState.status,
          sessionStatus: nextState.sessionStatus,
          profileStatus: nextState.profileStatus,
          isAuthenticated: nextState.isAuthenticated,
          isReady: nextState.isReady,
          errorType: nextState.error?.type ?? null,
          elapsedMs,
        })
        return result
      }

      const clearInvalidSession = async (error: unknown): Promise<LoadAuthResult> => {
        devWarn('invalid refresh token → clearing session', error)

        try {
          await authService.signOut()
        } catch (signOutError) {
          devWarn('signOut after invalid refresh token failed', signOutError)
        } finally {
          clearSupabaseAuthStorage()
          queryClient.clear()
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'))
          }
        }

        session = null
        user = null

        return commitState(
          buildSignedOutState({
            type: 'session_expired',
            message: SESSION_EXPIRED_MESSAGE,
          }),
          'invalid_refresh_token'
        )
      }

      if (!initialCheckDoneRef.current || authEvent === 'SIGNED_IN') {
        setState(LOADING_STATE)
      }

      devLog('bootstrap start', {
        runId,
        authEvent: authEvent ?? 'manual',
        useListenerSession,
        isInitialBootstrap,
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

            if (res.error) {
              if (isInvalidRefreshTokenError(res.error)) {
                return await clearInvalidSession(res.error)
              }
              throw res.error
            }

            session = res.data?.session ?? null
            user = session?.user ?? null
          } catch (err) {
            if (err instanceof Error && err.message === 'AUTH_SESSION_TIMEOUT') {
              devWarn('session timeout')
              return commitState(
                buildSessionNetworkErrorState(
                  'La comprobación de sesión tardó demasiado. Revisa tu conexión y vuelve a intentarlo.'
                ),
                'session_timeout'
              )
            }

            if (isInvalidRefreshTokenError(err)) {
              return await clearInvalidSession(err)
            }

            devWarn('session network error', err)
            return commitState(
              buildSessionNetworkErrorState(
                'No pudimos comprobar tu sesión. Revisa tu conexión y vuelve a intentarlo.'
              ),
              'session_network_error'
            )
          }
        }

        if (!session || !user) {
          devLog('no session')
          return commitState(SIGNED_OUT_STATE, 'signed_out')
        }

        devLog('auth session resolved', { userId: user.id })
        commitState(buildProfileLoadingState(session, user), 'session_resolved')

        const profileStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
        devLog('loading profile', { userId: user.id })

        let profile: Awaited<ReturnType<typeof usuariosService.getByAuthId>>
        try {
          const profileRequest = session.access_token
            ? usuariosService.getByAuthIdWithAccessToken(user.id, session.access_token)
            : usuariosService.getByAuthId(user.id)
          profile = await Promise.race([
            profileRequest,
            new Promise<never>((_, reject) => {
              window.setTimeout(
                () => reject(new Error('AUTH_PROFILE_TIMEOUT')),
                PROFILE_BOOTSTRAP_TIMEOUT_MS
              )
            }),
          ])
        } catch (err) {
          if (err instanceof Error && err.message === 'AUTH_PROFILE_TIMEOUT') {
            devWarn('profile timeout', { userId: user.id })
            return commitState(buildProfileTimeoutState(session, user), 'profile_timeout')
          }

          devWarn('profile network error', err)
          return commitState(buildProfileNetworkErrorState(session, user), 'profile_network_error')
        }

        if (!profile) {
          devWarn('no profile', { userId: user.id })
          return commitState(buildNoProfileState(session, user), 'no_profile')
        }

        if (!profile.activo) {
          devWarn('inactive user', { userId: user.id })
          return commitState(buildInactiveState(session, user, profile), 'user_inactive')
        }

        devLog('profile loaded', {
          userId: user.id,
          profileId: profile.id,
          elapsedMs: Math.round(
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) - profileStartedAt
          ),
        })
        return commitState(buildAuthenticatedState(session, user, profile), 'authenticated')
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          return await clearInvalidSession(err)
        }

        devWarn('session network error', err)
        return commitState(
          buildSessionNetworkErrorState(
            'No pudimos comprobar tu sesión. Revisa tu conexión y vuelve a intentarlo.'
          ),
          'unexpected_error'
        )
      }
    })()

    void bootstrapPromise.finally(() => {
      if (initialBootstrapPromiseRef.current === bootstrapPromise) {
        initialBootstrapPromiseRef.current = null
      }
    })

    if (isInitialBootstrap) {
      initialBootstrapPromiseRef.current = bootstrapPromise
    }

    return bootstrapPromise
  }, [queryClient])

  const logout = useCallback(async () => {
    devLog('logout manual')
    lastFullyAuthenticatedUserIdRef.current = null
    setState(SIGNED_OUT_STATE)
    try {
      await authService.signOut()
    } catch {
      // Ignorar error de signOut; sesión puede estar ya invalidada.
    } finally {
      clearSupabaseAuthStorage()
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
  }, [queryClient])

  useEffect(() => {
    isMountedRef.current = true

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      devLog('onAuthStateChange fired', {
        event,
        userId: session?.user?.id ?? null,
        runIdBefore: bootstrapRunIdRef.current,
      })

      if (
        event === 'SIGNED_IN' &&
        session?.user?.id &&
        session.user.id === lastFullyAuthenticatedUserIdRef.current
      ) {
        devLog('SIGNED_IN ignored: duplicate after full auth for this user', {
          userId: session.user.id,
        })
        return
      }

      const timerId = window.setTimeout(() => {
        authEventTimersRef.current = authEventTimersRef.current.filter((id) => id !== timerId)
        void initializeAuth(event, session)
      }, 0)
      authEventTimersRef.current.push(timerId)
    })

    const fallbackId = window.setTimeout(() => {
      if (initialCheckDoneRef.current) return
      if (initialBootstrapPromiseRef.current) {
        devLog('fallback skipped: bootstrap already in flight')
        return
      }
      devWarn('fallback bootstrap: initial auth event did not arrive, using getSession()')
      void initializeAuth()
    }, INITIAL_AUTH_EVENT_FALLBACK_MS)

    return () => {
      isMountedRef.current = false
      bootstrapRunIdRef.current += 1
      initialBootstrapPromiseRef.current = null
      for (const timerId of authEventTimersRef.current) {
        window.clearTimeout(timerId)
      }
      authEventTimersRef.current = []
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
