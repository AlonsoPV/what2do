import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getDefaultRouteByRole } from '@/features/auth/lib/permissions'

function HomeRedirect() {
  const { profile } = useAuth()
  return <Navigate to={getDefaultRouteByRole(profile?.rol)} replace />
}

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
          { index: true, element: <HomeRedirect /> },
          {
            path: ROUTES.DASHBOARD,
            lazy: async () => {
              const { DashboardPage } = await import('@/pages/dashboard/DashboardPage')
              return { Component: DashboardPage }
            },
          },
          {
            path: ROUTES.ESTRATEGIA,
            lazy: async () => {
              const { StrategicMapPage } = await import('@/pages/estrategia/StrategicMapPage')
              return { Component: StrategicMapPage }
            },
          },
          {
            path: ROUTES.DASHBOARD_KPIS,
            lazy: async () => {
              const { KpisDashboardPage } = await import('@/features/kpi/pages/KpisDashboardPage')
              return { Component: KpisDashboardPage }
            },
          },
          {
            path: ROUTES.DASHBOARD_GAPS,
            lazy: async () => {
              const { GapsDashboardPage } = await import('@/features/kpi/pages/GapsDashboardPage')
              return { Component: GapsDashboardPage }
            },
          },
          {
            path: ROUTES.DASHBOARD_IMPACTO,
            lazy: async () => {
              const { ImpactMatrixPage } = await import('@/features/kpi/pages/ImpactMatrixPage')
              return { Component: ImpactMatrixPage }
            },
          },
          {
            path: ROUTES.KANBAN,
            lazy: async () => {
              const { KanbanPage } = await import('@/pages/kanban/KanbanPage')
              return { Component: KanbanPage }
            },
          },
          {
            path: ROUTES.TICKETS,
            lazy: async () => {
              const { TicketsPage } = await import('@/features/tickets')
              return { Component: TicketsPage }
            },
          },
          {
            path: ROUTES.SPRINTS,
            lazy: async () => {
              const { SprintCenterPage } = await import('@/features/operations/pages/SprintCenterPage')
              return { Component: SprintCenterPage }
            },
          },
          {
            path: ROUTES.DISCIPLINA,
            lazy: async () => {
              const { DisciplinaPage } = await import('@/pages/disciplina/DisciplinaPage')
              return { Component: DisciplinaPage }
            },
          },
          {
            path: ROUTES.AREAS,
            lazy: async () => {
              const { AreasPage } = await import('@/pages/areas/AreasPage')
              return { Component: AreasPage }
            },
          },
          {
            path: ROUTES.CALENDARIO,
            lazy: async () => {
              const { CalendarPage } = await import('@/pages/calendar/CalendarPage')
              return { Component: CalendarPage }
            },
          },
          {
            path: ROUTES.REPORTES,
            lazy: async () => {
              const { ReportesPage } = await import('@/pages/reportes/ReportesPage')
              return { Component: ReportesPage }
            },
          },
          {
            path: ROUTES.NOTIFICACIONES,
            lazy: async () => {
              const { NotificacionesPage } = await import('@/pages/notificaciones/NotificacionesPage')
              return { Component: NotificacionesPage }
            },
          },
          {
            path: ROUTES.DISTANCIAS,
            lazy: async () => {
              const { DistanceDashboardPage } = await import('@/features/distance')
              return { Component: DistanceDashboardPage }
            },
          },
          {
            path: ROUTES.ACADEMIA,
            lazy: async () => {
              const { AcademyPage } = await import('@/features/academy')
              return { Component: AcademyPage }
            },
          },
          {
            path: ROUTES.AI_ASSIST,
            lazy: async () => {
              const { AiAssistPage } = await import('@/features/ai-support')
              return { Component: AiAssistPage }
            },
          },
          {
            path: ROUTES.MANUAL,
            lazy: async () => {
              const { ManualPage } = await import('@/pages/manual/ManualPage')
              return { Component: ManualPage }
            },
          },
          {
            path: ROUTES.PLAN_ACCION,
            lazy: async () => {
              const { PlanAccionRoute } = await import('@/features/plan-accion')
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
                  const { ProfilePage } = await import('@/features/users/pages/ProfilePage')
                  return { Component: ProfilePage }
                },
              },
              {
                path: 'users',
                lazy: async () => {
                  const { UsersPage } = await import('@/features/users/pages/UsersPage')
                  return { Component: UsersPage }
                },
              },
              {
                path: 'users/:id',
                lazy: async () => {
                  const { UserDetailPage } = await import('@/features/users/pages/UserDetailPage')
                  return { Component: UserDetailPage }
                },
              },
              {
                path: 'catalogs',
                lazy: async () => {
                  const { CatalogsHomePage } = await import('@/features/catalogs/pages/CatalogsHomePage')
                  return { Component: CatalogsHomePage }
                },
              },
              {
                path: 'catalogs/roles',
                lazy: async () => {
                  const { RolesPage } = await import('@/features/catalogs/pages/RolesPage')
                  return { Component: RolesPage }
                },
              },
              {
                path: 'catalogs/areas',
                lazy: async () => {
                  const { CatalogAreasPage } = await import('@/features/catalogs/pages/AreasPage')
                  return { Component: CatalogAreasPage }
                },
              },
              {
                path: 'catalogs/statuses',
                lazy: async () => {
                  const { StatusesPage } = await import('@/features/catalogs/pages/StatusesPage')
                  return { Component: StatusesPage }
                },
              },
              {
                path: 'catalogs/priorities',
                lazy: async () => {
                  const { PrioritiesPage } = await import('@/features/catalogs/pages/PrioritiesPage')
                  return { Component: PrioritiesPage }
                },
              },
              {
                path: 'catalogs/dropdowns',
                lazy: async () => {
                  const { DropdownCatalogsPage } = await import('@/features/catalogs/pages/DropdownCatalogsPage')
                  return { Component: DropdownCatalogsPage }
                },
              },
              {
                path: 'catalogs/dropdowns/:catalogId',
                lazy: async () => {
                  const { DropdownCatalogOptionsPage } =
                    await import('@/features/catalogs/pages/DropdownCatalogOptionsPage')
                  return { Component: DropdownCatalogOptionsPage }
                },
              },
              {
                path: 'catalogs/kpis',
                lazy: async () => {
                  const { KpisPage } = await import('@/features/catalogs/pages/KpisPage')
                  return { Component: KpisPage }
                },
              },
              {
                path: 'catalogs/gaps',
                lazy: async () => {
                  const { GapsPage } = await import('@/features/catalogs/pages/GapsPage')
                  return { Component: GapsPage }
                },
              },
              {
                path: 'academy/modules',
                lazy: async () => {
                  const { AcademyModulesAdminPage } = await import('@/features/academy')
                  return { Component: AcademyModulesAdminPage }
                },
              },
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
