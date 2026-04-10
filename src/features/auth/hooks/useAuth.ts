/**
 * Hook de autenticación.
 * Separado del Provider para que Fast Refresh no invalide `AuthContext.tsx`
 * por mezclar export de componente y hook en el mismo módulo.
 */

import { useContext } from 'react'
import { AuthStoreContext } from '../context/auth-store-context'

export function useAuth() {
  const ctx = useContext(AuthStoreContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
