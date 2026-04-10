import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { KanbanPage } from '@/pages/kanban/KanbanPage'
import { DisciplinaPage } from '@/pages/disciplina/DisciplinaPage'
import { AreasPage as PanelAreasPage } from '@/pages/areas/AreasPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { ReportesPage } from '@/pages/reportes/ReportesPage'
import { NotificacionesPage } from '@/pages/notificaciones/NotificacionesPage'
import { ManualPage } from '@/pages/manual/ManualPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ProfilePage } from '@/features/users/pages/ProfilePage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { UserDetailPage } from '@/features/users/pages/UserDetailPage'
import { CatalogsHomePage } from '@/features/catalogs/pages/CatalogsHomePage'
import { RolesPage } from '@/features/catalogs/pages/RolesPage'
import { CatalogAreasPage } from '@/features/catalogs/pages/AreasPage'
import { StatusesPage } from '@/features/catalogs/pages/StatusesPage'
import { PrioritiesPage } from '@/features/catalogs/pages/PrioritiesPage'
import { DropdownCatalogsPage } from '@/features/catalogs/pages/DropdownCatalogsPage'
import { DropdownCatalogOptionsPage } from '@/features/catalogs/pages/DropdownCatalogOptionsPage'
import { KpisPage } from '@/features/catalogs/pages/KpisPage'
import { GapsPage } from '@/features/catalogs/pages/GapsPage'
import {
  DistanceDashboardPage,
  DistanceSettingsPage,
  DistanceOriginsCatalogPage,
  DistanceDestinationsCatalogPage,
  DistanceRequestsSavedPage,
} from '@/features/distance'
import { GapsDashboardPage, KpisDashboardPage } from '@/features/kpi'
import { AcademyPage } from '@/features/academy'
import { ROUTES } from '@/constants'

const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: ROUTES.RESET_PASSWORD,
    element: <ResetPasswordPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
      { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
      { path: ROUTES.DASHBOARD_KPIS, element: <KpisDashboardPage /> },
      { path: ROUTES.DASHBOARD_GAPS, element: <GapsDashboardPage /> },
      { path: ROUTES.KANBAN, element: <KanbanPage /> },
      { path: ROUTES.DISCIPLINA, element: <DisciplinaPage /> },
      { path: ROUTES.AREAS, element: <PanelAreasPage /> },
      { path: ROUTES.CALENDARIO, element: <CalendarPage /> },
      { path: ROUTES.REPORTES, element: <ReportesPage /> },
      { path: ROUTES.NOTIFICACIONES, element: <NotificacionesPage /> },
      { path: ROUTES.DISTANCIAS, element: <DistanceDashboardPage /> },
      { path: ROUTES.ACADEMIA, element: <AcademyPage /> },
      { path: ROUTES.MANUAL, element: <ManualPage /> },
      {
        path: ROUTES.SETTINGS,
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.SETTINGS_PROFILE} replace /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'distancias', element: <DistanceSettingsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'users/:id', element: <UserDetailPage /> },
          { path: 'catalogs', element: <CatalogsHomePage /> },
          { path: 'catalogs/roles', element: <RolesPage /> },
          { path: 'catalogs/areas', element: <CatalogAreasPage /> },
          { path: 'catalogs/statuses', element: <StatusesPage /> },
          { path: 'catalogs/priorities', element: <PrioritiesPage /> },
          { path: 'catalogs/dropdowns', element: <DropdownCatalogsPage /> },
          { path: 'catalogs/dropdowns/:catalogId', element: <DropdownCatalogOptionsPage /> },
          { path: 'catalogs/kpis', element: <KpisPage /> },
          { path: 'catalogs/gaps', element: <GapsPage /> },
          { path: 'catalogs/origins', element: <DistanceOriginsCatalogPage /> },
          { path: 'catalogs/destinations', element: <DistanceDestinationsCatalogPage /> },
          { path: 'catalogs/solicitudes-guardadas', element: <DistanceRequestsSavedPage /> },
        ],
      },
    ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
])

export function Routes() {
  return <RouterProvider router={router} />
}
