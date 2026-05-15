import { Component, type ErrorInfo, type ReactNode } from 'react'
import { APP_NAME } from '@/constants'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }

type State = { hasError: boolean; message: string }

/**
 * Captura errores de renderizado en el árbol de React para evitar pantalla en blanco silenciosa.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error desconocido'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
          <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{APP_NAME}</p>
            <h1 className="mt-2 text-lg font-semibold text-foreground">Algo salió mal</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{this.state.message}</p>
            <div className="mt-6 flex justify-center">
              <Button type="button" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
