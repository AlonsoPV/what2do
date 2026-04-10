/**
 * Pantalla de carga durante la validación de sesión.
 * Evita flashes de contenido protegido.
 */

import { APP_NAME } from '@/constants'

export function AuthLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"
          aria-hidden
        >
          <div className="h-6 w-6 animate-pulse rounded-md bg-primary/40" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{APP_NAME}</h2>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Cargando"
        />
        <p className="text-sm text-muted-foreground">Comprobando tu sesión…</p>
      </div>
    </div>
  )
}
