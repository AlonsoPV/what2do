/**
 * Página del tablero de distancias: botón "Nueva solicitud" (abre popup),
 * tabla de solicitudes guardadas con todos los campos.
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DistanceRequestFormDialog } from '../components/DistanceRequestFormDialog'
import { SavedRoutesTable } from '../components/SavedRoutesTable'
import { useSavedRoutesList, useSaveRoute } from '../hooks/useSavedRoutes'
import { useCalculateRoute } from '../hooks/useCalculateRoute'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import type { SavedRoutePairRow } from '../types/distance.types'
import { Plus } from 'lucide-react'

export function DistanceDashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recalculatingPairKey, setRecalculatingPairKey] = useState<string | null>(null)
  const { data: savedRoutes = [], isLoading: routesLoading } = useSavedRoutesList()
  const calculateRoute = useCalculateRoute()
  const saveRoute = useSaveRoute()
  const { data: currentUser } = useCurrentUser()

  const handleRecalculate = useCallback(
    async (row: SavedRoutePairRow) => {
      setRecalculatingPairKey(row.pairKey)
      try {
        const result = await calculateRoute.mutateAsync({
          origin_id: row.origin_id,
          destination_id: row.destination_id,
          route_mode: 'DRIVE',
        })
        if (result?.ok && result.km_ida != null && result.km_vuelta != null) {
          await saveRoute.mutateAsync({
            origin_id: row.origin_id,
            destination_id: row.destination_id,
            origin_name_snapshot: row.originName,
            origin_location_snapshot: row.origin_location,
            destination_name_snapshot: row.destinationName,
            destination_location_snapshot: row.destination_location,
            km_ida: result.km_ida,
            km_vuelta: result.km_vuelta,
            duracion_ida_segundos: result.duracion_ida_segundos ?? null,
            duracion_vuelta_segundos: result.duracion_vuelta_segundos ?? null,
            route_mode: 'DRIVE',
            created_by: currentUser?.id ?? null,
          })
          toast.success('Ruta recalculada y guardada.')
        } else {
          toast.error(result?.message ?? 'No se pudo recalcular la ruta.')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al recalcular.')
      } finally {
        setRecalculatingPairKey(null)
      }
    },
    [calculateRoute, saveRoute, currentUser?.id]
  )

  return (
    <div id="distance-dashboard-page" className="distance-dashboard-page space-y-8">
      <header id="distance-dashboard-header" className="distance-dashboard-header">
        <h1 id="distance-dashboard-title" className="distance-dashboard-title text-2xl font-semibold tracking-tight">
          Distancias
        </h1>
        <p id="distance-dashboard-description" className="distance-dashboard-description text-sm text-muted-foreground mt-1">
          Calcula distancias ida y vuelta entre orígenes y destinos del catálogo. Guarda las solicitudes para ver el historial.
        </p>
        <p id="distance-dashboard-credits" className="distance-dashboard-credits text-xs text-muted-foreground mt-1">
          Powered by Google, ©{new Date().getFullYear()} Google
        </p>
      </header>

      <section
        id="distance-requests-section"
        className="distance-requests-section space-y-4"
        aria-labelledby="distance-requests-section-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="distance-requests-section-title" className="distance-requests-section-title text-lg font-medium">
            Solicitudes guardadas
          </h2>
          <Button
            id="distance-dashboard-btn-new-request"
            type="button"
            onClick={() => setDialogOpen(true)}
            className="distance-dashboard-btn-new-request"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden />
            Nueva solicitud
          </Button>
        </div>
        <SavedRoutesTable
          rows={savedRoutes}
          isLoading={routesLoading}
          onRecalculate={handleRecalculate}
          recalculatingPairKey={recalculatingPairKey}
        />
      </section>

      <DistanceRequestFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
