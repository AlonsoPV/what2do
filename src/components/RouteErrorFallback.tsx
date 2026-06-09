import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { APP_NAME } from '@/constants'
import { Button } from '@/components/ui/button'
import { PageLoadingFallback } from '@/components/PageLoadingFallback'
import { isChunkLoadError, reloadOnceOnChunkError } from '@/lib/importWithReload'

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `Error ${error.status}`
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Error desconocido'
}

export function RouteErrorFallback() {
  const error = useRouteError()
  const chunkError = isChunkLoadError(error)

  useEffect(() => {
    if (chunkError) reloadOnceOnChunkError()
  }, [chunkError])

  if (chunkError) {
    return <PageLoadingFallback />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{APP_NAME}</p>
        <h1 className="mt-2 text-lg font-semibold text-foreground">Algo salió mal</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{getErrorMessage(error)}</p>
        <div className="mt-6 flex justify-center">
          <Button type="button" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  )
}
