/**
 * Instancia estable de React Context para auth.
 * Vive en un archivo aparte para que al guardar `AuthContext.tsx` (HMR) no se ejecute de nuevo
 * `createContext()` y se rompa el enlace con el Provider (error: useAuth fuera de AuthProvider).
 */

import { createContext } from 'react'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import type { AuthState, LoadAuthResult } from '../types/auth.types'

export interface AuthStoreContextValue extends AuthState {
  logout: () => Promise<void>
  refetch: (authEvent?: AuthChangeEvent) => Promise<LoadAuthResult>
}

export const AuthStoreContext = createContext<AuthStoreContextValue | null>(null)
