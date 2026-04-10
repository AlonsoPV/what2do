import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { CatalogPageHeader } from '@/features/catalogs/components/CatalogPageHeader'
import { SavedRoutesTable } from '../components/SavedRoutesTable'
import { useSavedRoutesList, useSaveRoute, useDeactivateSavedRoutePair } from '../hooks/useSavedRoutes'
import { useCalculateRoute } from '../hooks/useCalculateRoute'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import type { SavedRoutePairRow } from '../types/distance.types'

/**
 * Página de catálogos: listado de rutas guardadas (saved_route_requests). Una fila por dirección.
 */
export function DistanceRequestsSavedPage() {
  const [recalculatingPairKey, setRecalculatingPairKey] = useState<string | null>(null)
  const [deactivatingPairKey, setDeactivatingPairKey] = useState<string | null>(null)
  const { data: savedRoutes = [], isLoading } = useSavedRoutesList()
  const calculateRoute = useCalculateRoute()
  const saveRoute = useSaveRoute()
  const deactivatePair = useDeactivateSavedRoutePair()
  const { data: currentUser } = useCurrentUser()

  const handleRecalculate = useCallback(
    async (row: SavedRoutePairRow) => {
      setRecalculatingPairKey(row.pairKey)
      try {
        const result = await calculateRoute.mutateAsync({
          origin_id: row.origin_id,
          destination_id: row.destination_id,
          route_mode: row.route_mode,
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
            route_mode: row.route_mode,
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

  const handleDeactivate = useCallback(
    async (row: SavedRoutePairRow) => {
      setDeactivatingPairKey(row.pairKey)
      try {
        await deactivatePair.mutateAsync({
          originId: row.origin_id,
          destinationId: row.destination_id,
          routeMode: row.route_mode,
        })
        toast.success('Ruta quitada del listado.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo quitar la ruta.')
        throw err
      } finally {
        setDeactivatingPairKey(null)
      }
    },
    [deactivatePair]
  )

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Rutas guardadas"
        description="Rutas calculadas y guardadas por origen y destino. Cada dirección (A→B) se consulta de forma independiente."
      />

      <SavedRoutesTable
        rows={savedRoutes}
        isLoading={isLoading}
        onRecalculate={handleRecalculate}
        recalculatingPairKey={recalculatingPairKey}
        onDeactivate={handleDeactivate}
        deactivatingPairKey={deactivatingPairKey}
      />
    </div>
  )
}
