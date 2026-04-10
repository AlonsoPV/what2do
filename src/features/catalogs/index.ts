/**
 * Feature: Catálogos / Configuración
 * CRUD para roles, áreas, estatus, prioridades, listas desplegables, KPIs y gaps O2C.
 * Componentes compartidos: CatalogFilterBar, CatalogTableLayout, CatalogRowActions, etc.
 */

export { CatalogsHomePage } from './pages/CatalogsHomePage'
export { RolesPage } from './pages/RolesPage'
export { CatalogAreasPage } from './pages/AreasPage'
export { StatusesPage } from './pages/StatusesPage'
export { PrioritiesPage } from './pages/PrioritiesPage'
export { DropdownCatalogsPage } from './pages/DropdownCatalogsPage'
export { DropdownCatalogOptionsPage } from './pages/DropdownCatalogOptionsPage'
export { KpisPage } from './pages/KpisPage'
export { GapsPage } from './pages/GapsPage'
export * from './types/catalogs.types'
export { CatalogFilterBar } from './components/CatalogFilterBar'
export { CatalogTableLayout } from './components/CatalogTableLayout'
export { CatalogRowActions } from './components/CatalogRowActions'
export { getDependencies, CATALOG_DEPENDENCIES } from './lib/catalog-registry'
export type { CatalogKey } from './lib/catalog-registry'
