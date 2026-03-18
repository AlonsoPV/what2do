/**
 * Diálogo (popup) para nueva solicitud de ruta.
 * Flujo: lookup saved_route_requests → si no hay, Calcular kilometraje → mostrar resultado → Guardar ruta calculada (dos filas A→B y B→A).
 */

import { useCallback, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DistanceRequestForm } from './DistanceRequestForm'
import { DistanceResultCard } from './DistanceResultCard'
import { useCalculateRoute } from '../hooks/useCalculateRoute'
import { useRouteLookup, useSaveRoute } from '../hooks/useSavedRoutes'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import type { CalculateRouteResult } from '../types/distance.types'

export interface DistanceRequestFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DistanceRequestFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: DistanceRequestFormDialogProps) {
  const { data: currentUser } = useCurrentUser()
  const [lookupOriginId, setLookupOriginId] = useState('')
  const [lookupDestinationId, setLookupDestinationId] = useState('')
  const [lastResult, setLastResult] = useState<CalculateRouteResult | null>(null)

  const { data: savedRoute, isLoading: lookupLoading } = useRouteLookup(lookupOriginId, lookupDestinationId, 'DRIVE')
  const calculateRoute = useCalculateRoute()
  const saveRoute = useSaveRoute()

  const handleOriginDestinationChange = useCallback((originId: string, destinationId: string) => {
    setLookupOriginId(originId)
    setLookupDestinationId(destinationId)
    setLastResult(null)
  }, [])

  const handleCalculate = useCallback(
    (originId: string, destinationId: string) => {
      setLastResult(null)
      calculateRoute.mutate(
        { origin_id: originId, destination_id: destinationId, route_mode: 'DRIVE' },
        {
          onSuccess: (result) => {
            setLastResult(result)
            if (result.ok) {
              toast.success(
                result.cached
                  ? 'Resultado desde catálogo (sin llamar a Google).'
                  : `Distancia calculada: ${result.km_total?.toFixed(2) ?? '—'} km total.`
              )
            } else {
              toast.error(result.message ?? 'No se pudo calcular la distancia.')
            }
          },
          onError: (err) => {
            const message = err instanceof Error ? err.message : 'Error al calcular la distancia.'
            setLastResult({ ok: false, message })
            toast.error(message)
          },
        }
      )
    },
    [calculateRoute]
  )

  const handleSaveRouteCalculated = useCallback(
    (
      result: CalculateRouteResult,
      origin: { nombre: string; ubicacion: string },
      destination: { nombre: string; ubicacion: string }
    ) => {
      if (!result.ok || result.km_ida == null || result.km_vuelta == null || !lookupOriginId || !lookupDestinationId) return
      saveRoute.mutate(
        {
          origin_id: lookupOriginId,
          destination_id: lookupDestinationId,
          origin_name_snapshot: origin.nombre,
          origin_location_snapshot: origin.ubicacion,
          destination_name_snapshot: destination.nombre,
          destination_location_snapshot: destination.ubicacion,
          km_ida: result.km_ida,
          km_vuelta: result.km_vuelta,
          duracion_ida_segundos: result.duracion_ida_segundos ?? null,
          duracion_vuelta_segundos: result.duracion_vuelta_segundos ?? null,
          route_mode: 'DRIVE',
          created_by: currentUser?.id ?? null,
        },
        {
          onSuccess: () => {
            toast.success('Ruta guardada correctamente.')
            onOpenChange(false)
            setLastResult(null)
            onSuccess?.()
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Error al guardar la ruta.')
          },
        }
      )
    },
    [saveRoute, lookupOriginId, lookupDestinationId, currentUser?.id, onOpenChange, onSuccess]
  )

  const showSaved = !!savedRoute && !lastResult
  const showCalculated = lastResult != null && lastResult.ok
  const resultError = lastResult != null && !lastResult.ok ? lastResult.message : null
  const sourceLabel = showSaved ? 'saved' : showCalculated ? 'calculated' : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="distance-request-form-dialog"
        className="distance-request-form-dialog max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl overflow-hidden flex flex-col p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Nueva solicitud de ruta</DialogTitle>
        <div className="shrink-0 border-b border-border/60 px-6 pr-12 py-4">
          <h2 className="text-lg font-semibold tracking-tight" aria-hidden>
            Nueva solicitud de ruta
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Elige origen y destino. Si ya está guardada se mostrará; si no, calcula y guarda la ruta.
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          <DistanceRequestForm
            simplified
            savedRoute={savedRoute ?? null}
            lastResult={lastResult}
            isCalculatePending={calculateRoute.isPending}
            isSavePending={saveRoute.isPending}
            onOriginDestinationChange={handleOriginDestinationChange}
            onCalculate={handleCalculate}
            onSaveRouteCalculated={handleSaveRouteCalculated}
          />
          {(showSaved || showCalculated || resultError) && (
            <DistanceResultCard
              distanceKm={showSaved ? savedRoute!.distance_km : undefined}
              duracionSegundos={showSaved ? savedRoute!.duration_seconds ?? undefined : undefined}
              km_ida={showCalculated ? lastResult!.km_ida : null}
              km_vuelta={showCalculated ? lastResult!.km_vuelta : null}
              km_total={showCalculated ? lastResult!.km_total : null}
              duracion_ida_segundos={showCalculated ? lastResult!.duracion_ida_segundos ?? null : null}
              duracion_vuelta_segundos={showCalculated ? lastResult!.duracion_vuelta_segundos ?? null : null}
              errorMessage={resultError}
              cached={showCalculated && lastResult!.cached}
              sourceLabel={sourceLabel}
              hidden={false}
            />
          )}
          {lookupLoading && (
            <p className="text-sm text-muted-foreground">Buscando ruta guardada…</p>
          )}
        </div>
        <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4 flex justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
