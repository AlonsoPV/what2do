/**
 * Fallback visible durante Suspense (rutas diferidas); evita pantalla en blanco al navegar.
 */

export function PageLoadingFallback() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-background px-4 py-16"
      role="status"
      aria-busy="true"
      aria-label="Cargando página"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  )
}
