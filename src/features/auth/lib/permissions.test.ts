import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants'
import {
  canAccessRouteByRole,
  getDefaultRouteByRole,
  isDirectionByRole,
  usesOperationalDashboardByRole,
} from './permissions'

describe('role route permissions', () => {
  it('allows Direccion to use analyst views plus users and catalogs', () => {
    const role = 'Direccion'

    expect(isDirectionByRole(role)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.KANBAN)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.CALENDARIO)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.NOTIFICACIONES)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_PROFILE)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_USERS)).toBe(true)
    expect(canAccessRouteByRole(role, '/settings/users/example-id')).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_CATALOGS)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_CATALOGS_KPIS)).toBe(true)
    expect(usesOperationalDashboardByRole(role)).toBe(true)
  })

  it('keeps Direccion out of hidden and non-analyst operational modules', () => {
    const role = 'Direccion'

    expect(canAccessRouteByRole(role, ROUTES.DASHBOARD)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.DASHBOARD_KPIS)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.REPORTES)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.DISCIPLINA)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.PLAN_ACCION)).toBe(false)
  })

  it('keeps Operativo limited to profile inside settings', () => {
    const role = 'Operativo'

    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_PROFILE)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_USERS)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_CATALOGS)).toBe(false)
  })

  it('treats extended operative catalog names as operative roles', () => {
    const role = 'Operativo O2C'

    expect(canAccessRouteByRole(role, ROUTES.DASHBOARD)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.KANBAN)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_USERS)).toBe(false)
    expect(usesOperationalDashboardByRole(role)).toBe(true)
    expect(getDefaultRouteByRole(role)).toBe(ROUTES.KANBAN)
  })

  it('keeps Analista limited to Kanban only', () => {
    const role = 'Analista'

    expect(canAccessRouteByRole(role, ROUTES.KANBAN)).toBe(true)
    expect(canAccessRouteByRole(role, ROUTES.DASHBOARD)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.DISCIPLINA)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.CALENDARIO)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.TICKETS)).toBe(false)
    expect(canAccessRouteByRole(role, ROUTES.SETTINGS_PROFILE)).toBe(false)
    expect(usesOperationalDashboardByRole(role)).toBe(false)
    expect(getDefaultRouteByRole(role)).toBe(ROUTES.KANBAN)
  })

  it('hides operational analytics modules for all roles', () => {
    for (const role of ['DG', 'Sistemas', 'super_admin', 'Operativo', 'Direccion'] as const) {
      expect(canAccessRouteByRole(role, ROUTES.DASHBOARD)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.DASHBOARD_KPIS)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.DASHBOARD_GAPS)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.DASHBOARD_IMPACTO)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.REPORTES)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.SPRINTS)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.TICKETS)).toBe(false)
      expect(canAccessRouteByRole(role, ROUTES.DISCIPLINA)).toBe(false)
    }
  })

  it('sends every role to Kanban after login', () => {
    expect(getDefaultRouteByRole('DG')).toBe(ROUTES.KANBAN)
    expect(getDefaultRouteByRole('Operativo')).toBe(ROUTES.KANBAN)
    expect(getDefaultRouteByRole('Analista')).toBe(ROUTES.KANBAN)
  })

  it('keeps executive roles on the executive dashboard experience flag', () => {
    expect(usesOperationalDashboardByRole('DG')).toBe(false)
    expect(usesOperationalDashboardByRole('Sistemas')).toBe(false)
    expect(usesOperationalDashboardByRole('super_admin')).toBe(false)
  })
})
