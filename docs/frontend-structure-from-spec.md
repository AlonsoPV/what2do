# Estructura del proyecto frontend

Alineada con `dashboard-spec.md` y con la base actual. React + Vite + TypeScript.

---

## Estructura recomendada en `src/`

```
src/
  components/
    ui/                    # shadcn/ui y primitivos
    layout/                # AppLayout, Sidebar, Header, SettingsLayout
    shared/                # Componentes reutilizables entre features (opcional)
  pages/                   # Páginas por ruta (contenedores que usan features)
    auth/
      LoginPage.tsx
    dashboard/
      DashboardPage.tsx
    kanban/
      KanbanPage.tsx
    disciplina/
      DisciplinaPage.tsx
    areas/
      AreasPage.tsx        # Panel de área (no catálogo)
    calendar/
      CalendarPage.tsx
    reportes/
      ReportesPage.tsx
    notificaciones/
      NotificacionesPage.tsx
    manual/
      ManualPage.tsx
  features/
    auth/                  # Login, sesión
    dashboard/             # Tarjetas KPI, tabla acciones, semáforo, burndown (si se integra)
    operations/            # CRUD acciones, filtros, detalle, evidencia, dependencias
    metrics/               # Disciplina (métricas por usuario)
    areas/                 # Panel de área (one-pager, checklist)
    reports/               # Reportes históricos, exportación
    notifications/         # Centro de notificaciones
    calendar/              # Vista calendario
    manual/                # Manual, tutorial, chat IA
    users/                 # Admin usuarios (listado, detalle, formulario, activar/desactivar)
    catalogs/              # Catálogos: índice, roles, áreas, estatus, prioridades, dropdowns, KPIs
  hooks/                   # Hooks globales (useAuth, useMedia, etc.)
  lib/
    supabase/
      client.ts            # Cliente Supabase (solo VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY en build)
    utils.ts
  services/                # Servicios globales (auth, reportes, etc.) o re-export
  store/                   # Zustand (solo si se necesita estado global)
  types/                   # Tipos y enums globales (entities, enums, support)
  constants/               # ROUTES, APP_NAME, etc.
  schemas/                 # Schemas Zod globales (si no viven en features)
  styles/
    globals.css
  App.tsx
  main.tsx
  routes/
    index.tsx              # createBrowserRouter, rutas
  vite-env.d.ts
```

---

## Convenciones

- **features/** contiene por módulo: `pages/`, `components/`, `hooks/`, `services/`, `types/`, `schemas/` cuando el módulo es dueño de esa capa.
- **pages/** en raíz: contenedores de ruta que importan de features o de `components/layout`.
- **No llamadas a Supabase en componentes:** usar hooks que llamen a servicios.
- **Servicios:** por dominio (acciones, usuarios, catalogs/*, kpis, notificaciones, reportes, disciplina, clientes, procesos, okrs).
- **Tipos:** alineados con spec y tablas; entidades en `types/entities.ts` o en el feature.
- **Rutas:** definidas en `constants` y usadas en `routes/index.tsx`.

---

## Estado actual vs recomendado

- **Ya existe:** layout (AppLayout, Sidebar, SettingsLayout), páginas por módulo, features (auth, users, catalogs, operations, metrics, reports, areas, notifications, calendar, manual), hooks, servicios en features y en `services/`, tipos, constantes ROUTES, React Query provider, cliente Supabase.
- **Mantener:** No romper esta estructura; extender o refactorizar de forma incremental.
- **Opcional:** `shared/` bajo `components/` si hay componentes que varios features reutilizan y no pertenecen a un solo feature.

---

*Estructura alineada con dashboard-spec y arquitectura. Versión 1.0.*
