# Plan de implementación — Tablero Operativo Q·Quiero

Derivado de `dashboard-spec.md`, `dashboard-spec-analysis.md` y `architecture-from-spec.md`. Prioridades, orden y dependencias para desarrollo real.

---

## 1. Módulos a desarrollar (estado y prioridad)

| Módulo | Prioridad | Estado actual | Objetivo |
|--------|-----------|----------------|----------|
| **auth** | P0 | Login existe; registro y recuperación de contraseña pendientes | Login estable; TODO registro y “olvidé contraseña” |
| **dashboard** | P0 | Página base con placeholders | Tarjetas KPI (acciones día, completadas, bloqueadas, sin evidencia, eficiencia); tabla de acciones filtrable; semáforo KPI; burndown (integrar si existe componente) |
| **operations** | P0 | Servicios/hooks base | Listado con filtros (fecha, estado, prioridad, área, responsable); detalle (modal o ruta); formulario crear/editar; cambiar estado; subir evidencia; dependencias y multi-área (según spec) |
| **kanban** | P0 | Página placeholder | Columnas por estado; drag & drop; subir evidencia desde tarjeta; filtro por usuario autenticado |
| **users** | P0 | Implementado (listado, detalle, formulario, activar/desactivar) | Mantener; TODO gestión contraseña y asignación explícita app_role |
| **catalogs** | P0 | Implementado (roles, áreas, estatus, prioridades, dropdowns, KPIs) | Mantener; alinear nombres con spec donde aplique |
| **metrics (disciplina)** | P1 | Página y posible servicio | Conectar a medicion_disciplina; mostrar placeholder si no hay cálculo automático; TODO trigger de cálculo |
| **areas** (panel) | P1 | Página placeholder | One-pager por área; checklist diario; reportes por área (depende area_reportes_diarios, area_onepager_config) |
| **reportes** | P1 | Servicio y página base | Filtros (responsable, rango fechas); exportación PDF/Excel con datos filtrados |
| **notifications** | P1 | Servicio y página | Listado por usuario; marcar leído; filtrar por tipo/prioridad/leído |
| **calendar** | P2 | Página placeholder | Vista por fechas; selección de día → acciones del día |
| **manual** | P2 | Página placeholder | Navegación documentación; tutorial; chat IA (según spec) |
| **KPIs sagrados y semáforo** | P1 | Servicios/types posibles | Lectura kpis, kpi_metas, kpi_mediciones; componente semáforo; alertas según notificar_a (TODO si no hay backend) |

---

## 2. Prioridad sugerida

- **P0 (crítico):** auth estable, dashboard funcional, operations (CRUD + estado + evidencia), kanban básico, users, catalogs. Sin esto no hay flujo operativo mínimo.
- **P1 (alto):** disciplina (con o sin cálculo automático), panel de área, reportes + exportación, notificaciones, semáforo KPI.
- **P2 (medio):** calendario, manual/tutorial/chat.

---

## 3. Orden recomendado de implementación

1. **Alinear y cerrar base**
   - Confirmar que migraciones aplicadas (incl. usuarios.rol como text y catálogos).
   - Variables de entorno: **frontend** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (ver [environment-variables.md](./environment-variables.md)) y cliente en `src/lib/supabase/client.ts`.
   - React Query provider y rutas actuales estables.

2. **Dashboard**
   - Tarjetas de métricas (totales del día desde acciones_diarias).
   - Tabla de acciones del día con filtros (fecha, estado, prioridad, área, responsable para admin).
   - Enlaces a detalle (modal o ruta) y a “Crear acción”.
   - Placeholder o integración de semáforo KPI y burndown.

3. **Operations (acciones diarias)**
   - Servicio/hooks: list con filtros, getById, create, update, delete (respetando RLS).
   - Formulario crear/editar con validación (Zod): descripcion_accion 10–500, evidencia_esperada ≥5, responsable, hora_limite, opcionales KPI, OKR, proceso, área, cliente.
   - Detalle: datos, historial (accion_historial), evidencias, acciones (cambiar estado, subir evidencia).
   - Reglas en UI: Hecho solo con evidencia; Verificado solo DG/Sistemas.
   - Dependencias y multi-área: según spec (tablas ya existen); UI en segunda iteración si hace falta.

4. **Kanban**
   - Columnas por action_status.
   - Listado de acciones del usuario por estado.
   - Drag & drop para cambiar estado (con validaciones Hecho/Verificado).
   - Botón/flow subir evidencia desde tarjeta.

5. **Users y Catalogs**
   - Revisar que usuarios use catálogos (roles, áreas) y que no se rompa nada.
   - Catálogos: ya listos; solo ajustes de copy o validaciones si hace falta.

6. **Disciplina**
   - Lectura de medicion_disciplina por usuario y fecha.
   - UI con placeholders si no hay datos (y documentar TODO de cálculo automático).

7. **Reportes y exportación**
   - Consulta acciones con mismos filtros que dashboard (responsable, rango).
   - Generación PDF (jsPDF) y Excel (xlsx) en cliente con datos filtrados.

8. **Notificaciones**
   - Listado, marcar leído, filtrar; crear notificaciones desde backend/triggers (verificar si existen).

9. **Panel de área, calendario, manual**
   - En ese orden según tiempo; todos con placeholders aceptables hasta tener datos y lógica completa.

---

## 4. Dependencias entre módulos

```
auth ──────────────────────────────────────────────────────────────► todos los módulos (sesión)
     │
catalogs (roles, áreas, statuses, priorities, etc.)
     │
     ├──► users (rol, área desde catálogos)
     ├──► operations (prioridad, estado, área en filtros/formulario)
     ├──► dashboard (filtros, tabla)
     └──► reportes (filtros)

users ──► operations (responsable, responsable_bloqueo, verificadores)
       ──► dashboard / reportes (filtro responsable para admin)

operations (acciones_diarias) ──► dashboard (métricas y tabla)
                                ──► kanban (columnas)
                                ──► reportes (datos exportación)
                                ──► disciplina (origen de medición cuando exista cálculo)
                                ──► kpis (kpi_afectado, cumplimiento)

kpis (sagrados + metas) ──► dashboard (semáforo)
                         ──► operations (selector KPI en formulario)

notificaciones ──► triggers en BD (cambio estado, evidencia, dependencias); front solo consume
```

---

## 5. Riesgos técnicos detectados

| Riesgo | Mitigación |
|--------|------------|
| **medicion_disciplina vacía** | Mostrar mensaje “Sin datos” y documentar TODO; implementar trigger/función en siguiente iteración. |
| **Límite 1000 filas (PostgREST)** | Filtros por fecha obligatorios; paginación en listado de acciones si un día supera 1000. |
| **Verificación de estado (solo DG/Sistemas)** | Implementar en backend (trigger o RLS) y en front (ocultar “Verificar” si no es DG/Sistemas). |
| **Fórmulas KPI reales (OTIF, DSO, NPS, Margen)** | Spec indica fuentes no conectadas; mantener cálculo por acciones completadas y marcar TODO para integración ERP/CRM. |
| **Recuperación de contraseña** | No inventar flujo; dejar TODO hasta definir con producto. |
| **Permisos por área no definidos** | No implementar restricciones por área más allá de lo que diga la spec. |
| **Escalamiento automático y flujo cascada** | Campos y tablas existen; lógica automática como backlog con TODO. |

---

## 6. Criterios de “listo para desarrollo real”

- [ ] Análisis y arquitectura documentados y revisados.
- [ ] Migraciones aplicadas en entorno de desarrollo.
- [ ] Cliente Supabase y variables de entorno configurados.
- [ ] Rutas y layout estables; navegación por módulos sin errores.
- [ ] Dashboard muestra al menos métricas básicas y tabla de acciones del día.
- [ ] Operations: al menos listado filtrable, detalle y formulario de creación/edición con validación.
- [ ] Kanban: columnas por estado y movimientos básicos (aunque sea sin drag & drop en primera versión).
- [ ] Users y Catalogs estables y alineados con spec.
- [ ] TODOs y supuestos registrados en código y en docs (dashboard-spec-analysis, implementation-plan).

---

*Plan de implementación. Versión 1.0. Actualizar según avance del proyecto.*
