import { Suspense } from 'react'
import { Toaster } from 'sonner'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { PageLoadingFallback } from '@/components/PageLoadingFallback'
import { AppProviders } from '@/providers'
import { Routes } from '@/routes'

export function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes />
        </Suspense>
      </AppErrorBoundary>
      <Toaster richColors position="top-right" />
    </AppProviders>
  )
}
