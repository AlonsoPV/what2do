import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RouteErrorFallback } from '@/components/RouteErrorFallback'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { PageLoadingFallback } from '@/components/PageLoadingFallback'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getDefaultRouteByRole } from '@/features/auth/lib/permissions'
import { importWithReload } from '@/lib/importWithReload'

function HomeRedirect() {
  const { profile } = useAuth()
  return <Navigate to={getDefaultRouteByRole(profile?.rol)} replace />
}

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorFallback />,
    children: [
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
    path: ROUTES.WEBTEST,
    lazy: async () => {
      const { WebtestPage } = await importWithReload(() => import('@/pages/webtest/WebtestPage'))
      return { Component: WebtestPage }
    },
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    hydrateFallbackElement: <PageLoadingFallback />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        hydrateFallbackElement: <PageLoadingFallback />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            path: ROUTES.DASHBOARD,
            lazy: async () => {
              const { DashboardPage } = await importWithReload(() => import('@/pages/dashboard/DashboardPage'))
              return { Component: DashboardPage }
            },
          },
          {
            path: ROUTES.DASHBOARD_KPIS,
            lazy: async () => {
              const { KpisDashboardPage } = await importWithReload(() => import('@/features/kpi/pages/KpisDashboardPage'))
              return { Component: KpisDashboardPage }
            },
          },
          {
            path: ROUTES.DASHBOARD_GAPS,
            lazy: async () => {
              const { GapsDashboardPage } = await importWithReload(() => import('@/features/kpi/pages/GapsDashboardPage'))
              return { Component: GapsDashboardPage }
            },
          },
          {
            path: ROUTES.DASHBOARD_IMPACTO,
            lazy: async () => {
              const { ImpactMatrixPage } = await importWithReload(() => import('@/features/kpi/pages/ImpactMatrixPage'))
              return { Component: ImpactMatrixPage }
            },
          },
          {
            path: ROUTES.KANBAN,
            lazy: async () => {
              const { KanbanPage } = await importWithReload(() => import('@/pages/kanban/KanbanPage'))
              return { Component: KanbanPage }
            },
          },
          {
            path: ROUTES.TICKETS,
            lazy: async () => {
              const { TicketsPage } = await importWithReload(() => import('@/features/tickets'))
              return { Component: TicketsPage }
            },
          },
          {
            path: ROUTES.SPRINTS,
            lazy: async () => {
              const { SprintCenterPage } = await importWithReload(() => import('@/features/operations/pages/SprintCenterPage'))
              return { Component: SprintCenterPage }
            },
          },
          {
            path: ROUTES.DISCIPLINA,
            lazy: async () => {
              const { DisciplinaPage } = await importWithReload(() => import('@/pages/disciplina/DisciplinaPage'))
              return { Component: DisciplinaPage }
            },
          },
          {
            path: ROUTES.AREAS,
            lazy: async () => {
              const { AreasPage } = await importWithReload(() => import('@/pages/areas/AreasPage'))
              return { Component: AreasPage }
            },
          },
          {
            path: ROUTES.CALENDARIO,
            lazy: async () => {
              const { CalendarPage } = await importWithReload(() => import('@/pages/calendar/CalendarPage'))
              return { Component: CalendarPage }
            },
          },
          {
            path: ROUTES.REPORTES,
            lazy: async () => {
              const { ReportesPage } = await importWithReload(() => import('@/pages/reportes/ReportesPage'))
              return { Component: ReportesPage }
            },
          },
          {
            path: ROUTES.NOTIFICACIONES,
            lazy: async () => {
              const { NotificacionesPage } = await importWithReload(() => import('@/pages/notificaciones/NotificacionesPage'))
              return { Component: NotificacionesPage }
            },
          },
          {
            path: ROUTES.DISTANCIAS,
            lazy: async () => {
              const { DistanceDashboardPage } = await importWithReload(() => import('@/features/distance'))
              return { Component: DistanceDashboardPage }
            },
          },
          {
            path: ROUTES.MANUAL,
            lazy: async () => {
              const { ManualPage } = await importWithReload(() => import('@/pages/manual/ManualPage'))
              return { Component: ManualPage }
            },
          },
          {
            path: ROUTES.PLAN_ACCION,
            lazy: async () => {
              const { PlanAccionRoute } = await importWithReload(() => import('@/features/plan-accion'))
              return { Component: PlanAccionRoute }
            },
          },
          {
            path: ROUTES.SETTINGS,
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to={ROUTES.SETTINGS_PROFILE} replace /> },
              {
                path: 'profile',
                lazy: async () => {
                  const { ProfilePage } = await importWithReload(() => import('@/features/users/pages/ProfilePage'))
                  return { Component: ProfilePage }
                },
              },
              {
                path: 'users',
                lazy: async () => {
                  const { UsersPage } = await importWithReload(() => import('@/features/users/pages/UsersPage'))
                  return { Component: UsersPage }
                },
              },
              {
                path: 'users/:id',
                lazy: async () => {
                  const { UserDetailPage } = await importWithReload(() => import('@/features/users/pages/UserDetailPage'))
                  return { Component: UserDetailPage }
                },
              },
              {
                path: 'whatsapp',
                lazy: async () => {
                  const { WhatsAppSettingsPage } = await importWithReload(() => import('@/pages/settings/WhatsAppSettingsPage'))
                  return { Component: WhatsAppSettingsPage }
                },
              },
              {
                path: 'catalogs',
                lazy: async () => {
                  const { CatalogsHomePage } = await importWithReload(() => import('@/features/catalogs/pages/CatalogsHomePage'))
                  return { Component: CatalogsHomePage }
                },
              },
              {
                path: 'catalogs/roles',
                lazy: async () => {
                  const { RolesPage } = await importWithReload(() => import('@/features/catalogs/pages/RolesPage'))
                  return { Component: RolesPage }
                },
              },
              {
                path: 'catalogs/areas',
                lazy: async () => {
                  const { CatalogAreasPage } = await importWithReload(() => import('@/features/catalogs/pages/AreasPage'))
                  return { Component: CatalogAreasPage }
                },
              },
              {
                path: 'catalogs/statuses',
                lazy: async () => {
                  const { StatusesPage } = await importWithReload(() => import('@/features/catalogs/pages/StatusesPage'))
                  return { Component: StatusesPage }
                },
              },
              {
                path: 'catalogs/priorities',
                lazy: async () => {
                  const { PrioritiesPage } = await importWithReload(() => import('@/features/catalogs/pages/PrioritiesPage'))
                  return { Component: PrioritiesPage }
                },
              },
              {
                path: 'catalogs/dropdowns',
                lazy: async () => {
                  const { DropdownCatalogsPage } = await importWithReload(() => import('@/features/catalogs/pages/DropdownCatalogsPage'))
                  return { Component: DropdownCatalogsPage }
                },
              },
              {
                path: 'catalogs/dropdowns/:catalogId',
                lazy: async () => {
                  const { DropdownCatalogOptionsPage } =
                    await importWithReload(() => import('@/features/catalogs/pages/DropdownCatalogOptionsPage'))
                  return { Component: DropdownCatalogOptionsPage }
                },
              },
              {
                path: 'catalogs/kpis',
                lazy: async () => {
                  const { KpisPage } = await importWithReload(() => import('@/features/catalogs/pages/KpisPage'))
                  return { Component: KpisPage }
                },
              },
              {
                path: 'catalogs/gaps',
                lazy: async () => {
                  const { GapsPage } = await importWithReload(() => import('@/features/catalogs/pages/GapsPage'))
                  return { Component: GapsPage }
                },
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.KANBAN} replace /> },
    ],
  },
])

export function Routes() {
  return <RouterProvider router={router} />
}
