/**
 * Módulo de distancias: catálogos origen/destino, cálculo ida/vuelta vía Edge Function,
 * tablero de solicitudes (distance_requests).
 */

export { DistanceDashboardPage } from './pages/DistanceDashboardPage'
export { DistanceSettingsPage } from './pages/DistanceSettingsPage'
export { DistanceOriginsCatalogPage } from './pages/DistanceOriginsCatalogPage'
export { DistanceDestinationsCatalogPage } from './pages/DistanceDestinationsCatalogPage'
export { DistanceRequestsSavedPage } from './pages/DistanceRequestsSavedPage'
export { DistanceRequestForm } from './components/DistanceRequestForm'
export { DistanceRequestFormDialog } from './components/DistanceRequestFormDialog'
export { DistanceResultCard } from './components/DistanceResultCard'
export { DistanceRequestsTable } from './components/DistanceRequestsTable'
export { SavedRoutesTable } from './components/SavedRoutesTable'
export { OriginSelect } from './components/OriginSelect'
export { DestinationSelect } from './components/DestinationSelect'
export { useOrigins } from './hooks/useOrigins'
export { useDestinations } from './hooks/useDestinations'
export { useCalculateRoute } from './hooks/useCalculateRoute'
export { useDistanceRequests, useCreateDistanceRequest, DISTANCE_REQUESTS_QUERY_KEY } from './hooks/useDistanceRequests'
export {
  useRouteLookup,
  useSaveRoute,
  useSavedRoutesList,
  useDeactivateSavedRoutePair,
  SAVED_ROUTES_QUERY_KEY,
} from './hooks/useSavedRoutes'
export { distanceService } from './services/distance.service'
export {
  lookupSavedRoute,
  saveRouteCalculated,
  listSavedRoutes,
  deactivateSavedRoutePair,
} from './services/savedRoutes.service'
export { originsService } from './services/origins.service'
export { destinationsService } from './services/destinations.service'
export { distanceRequestFormSchema } from './schemas/distance-request.schema'
export type {
  DistanceOrigin,
  DistanceDestination,
  DistanceCatalogRow,
  DistanceRequestRow,
  DistanceRequestWithDetails,
  SavedRouteRequestRow,
  SavedRouteRequestWithDetails,
  CalculateRoutePayload,
  CalculateRouteResult,
  DistanceRequestFormValues,
} from './types/distance.types'
