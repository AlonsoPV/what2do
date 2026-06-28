# Formulario de creación de acción

Documentación de los campos del modal **Nueva acción** (`AccionFormDialog` + `AccionForm`).

**Componentes:** `src/features/operations/components/AccionFormDialog.tsx`, `AccionForm.tsx`  
**Validación:** `src/features/operations/schemas/accion.schema.ts` (`accionCreateSchema`)

---

## Resumen del flujo

1. El usuario abre el diálogo desde Kanban o Dashboard (roles con permiso de creación).
2. Completa tres bloques en acordeón (bloques 2 y 3 inician colapsados).
3. Al guardar se valida con Zod; la fecha/hora límite debe quedar **después del momento actual** (zona CDMX).
4. Tras crear la acción, en segundo plano pueden ejecutarse: vínculos O2C, checklist, subida de evidencias y notificación al responsable.

**Estado inicial al crear:** `Pendiente` (no editable en el formulario de creación).

**Valores por defecto:**

| Campo | Valor inicial |
|-------|----------------|
| Fecha | Hoy (calendario CDMX) o la fecha del filtro Kanban si aplica |
| Hora límite | `17:00` |
| Prioridad | Primera del catálogo O2C; si existe, `P2_Media` |
| Tipo de acción | `operativa` (RUN) — fijado por el formulario |
| Story points | `0` |
| Brechas / KPIs | Vacíos |
| Área | Sin seleccionar |

---

## Estructura del formulario (3 bloques)

### Bloque 1 — Información principal

*¿Qué se hará, quién lo hará y para cuándo?*

| Campo UI | Campo interno / BD | Obligatorio | Tipo | Validación | Notas |
|----------|-------------------|-------------|------|------------|-------|
| **Título de la acción** | `titulo_accion` | Sí | Texto | Máx. **70** caracteres | Contador visible en pantalla. |
| **Descripción** | `descripcion_accion` (vía `descripcion_simple`) | Sí | Textarea | Mín. **15** caracteres en modo simple | Se guarda como texto unificado en `descripcion_accion`. |
| **Responsable de ejecutar** | `responsable` | Sí | Select (UUID usuario) | UUID válido | Lista de usuarios activos. Persona que ejecuta y cierra la acción. |
| **Prioridad** | `prioridad` + `prioridad_id` | Sí | Select catálogo O2C | Nombre del catálogo de prioridades | Urgencia según catálogo. |
| **Fecha y hora límite** | `fecha` + `hora_limite` | Sí | `date` + `time` | Fecha `YYYY-MM-DD`; hora `HH:MM` (00–23, 00–59) | Input fecha con `min` = hoy. Al guardar: fecha/hora deben ser **futuras** respecto al momento de creación (CDMX). |

---

### Bloque 2 — Impacto estratégico / Planeación operativa

El título del bloque depende del rol:

- **Roles con vista O2C** (no analista, no dirección, no operativo): *Impacto estratégico* — muestra brechas y KPIs.
- **Resto de roles**: *Planeación operativa* — solo story points y área.

| Campo UI | Campo interno / BD | Obligatorio | Tipo | Validación | Notas |
|----------|-------------------|-------------|------|------------|-------|
| **Brecha que atiende** | `gap_ids` → `gap_id` (primero de la lista) | No | Multi-select con búsqueda | Hasta 50 UUIDs | Solo si `canViewO2cImpactFields`. Catálogo de brechas activas. Al elegir brecha puede autocompletar **Área**. |
| **Indicador impactado** | `catalog_kpi_ids` → `catalog_kpi_id` (primero) | No | Multi-select con búsqueda | Hasta 50 UUIDs | KPIs filtrados por brechas seleccionadas (si el KPI tiene `gap_id`). |
| **Story points** | `story_points` | No | Botones 0, 1, 2, 3, 5, 8, 13 | `0` o Fibonacci válido | Escala de esfuerzo relativo. `0` = no aplica. |
| **Área** | `area` | No | Select catálogo | Texto (nombre de área) | Puede autocompletarse al vincular una brecha. |

#### Campos en schema pero ocultos en UI (creación actual)

El modelo y el schema soportan estos campos; hoy el formulario los fija automáticamente:

| Campo | Valor forzado | Cuándo sería relevante |
|-------|---------------|------------------------|
| `tipo_accion` | `operativa` | Sprint, estratégica o desbloqueo (futuro) |
| `sprint_id` | `null` | Obligatorio si `tipo_accion === 'sprint'` |
| `responsable_bloqueo` | `null` | Obligatorio si `tipo_accion === 'desbloqueo'` |

---

### Bloque 3 — Evidencia y validación

*Qué comprobará el cierre de la acción.*

| Campo UI | Campo interno / BD | Obligatorio | Tipo | Validación | Notas |
|----------|-------------------|-------------|------|------------|-------|
| **¿Qué evidencia comprobará que se hizo?** | `evidencia_esperada` | Sí | Cards del catálogo `evidencia_esperada` o texto libre | Mín. **5** caracteres | Si el catálogo tiene opción «Otro», aparece campo de texto adicional. |

#### Solo en creación (fuera del schema principal)

| Sección | Persistencia | Validación | Notas |
|---------|--------------|------------|-------|
| **Puntos a validar** (checklist) | `accion_checkpoints` tras crear | Cada ítem: mín. **3**, máx. **400** caracteres; sin duplicados | Opcional. Si hay ítems, deben completarse antes de marcar la acción como **Hecha**. |
| **Apoyo documental** (adjuntos) | Storage + `accion_evidencias` tras crear | PDF, PNG, JPG, CSV o Excel; máx. **10 MB** por archivo; hasta **10** archivos en cola | Opcional. Se suben después de obtener el `id` de la acción. Marca `evidencia_cargada = true` si hay archivos. |

---

## Campos automáticos (no visibles en el formulario)

| Campo | Valor al crear |
|-------|----------------|
| `estado` | `Pendiente` |
| `created_by` | Usuario autenticado actual |
| `fecha` | Si no se envía, hoy (CDMX) |
| `descripcion_accion` | Generado desde `descripcion_simple` (modo simple) |

---

## Permisos y visibilidad

| Rol / condición | Crear acción | Ver brechas/KPIs | Checklist al crear | Adjuntos al crear |
|-----------------|-------------|------------------|--------------------|-------------------|
| Analista | No (botón oculto en Kanban) | — | — | — |
| Dirección / Operativo | Sí | No (bloque 2 sin O2C) | Sí | Sí |
| Admin / roles con vista O2C | Sí | Sí | Sí | Sí |

---

## Reglas de negocio al guardar

1. **Fecha/hora futura:** `validateFutureDateTimeCDMX` — la combinación fecha + hora límite debe ser posterior al momento de creación (CDMX).
2. **Notificación:** si hay responsable, se crea notificación in-app (y puede disparar integraciones según configuración).
3. **Vínculos O2C:** `syncAccionO2cLinks` persiste relaciones en tablas puente para brechas y KPIs seleccionados.
4. **Checklist:** `accionCheckpointsService.insertMany` solo si hay borradores válidos.
5. **Evidencias:** subida paralela tras crear; errores en tareas secundarias no revierten la acción ya creada (se muestra aviso).

---

## Modo edición (referencia breve)

Al editar una acción existente, la mayoría de campos estratégicos quedan **solo lectura** (título, responsable, fecha, descripción original, brechas, KPIs, evidencia esperada). En edición se pueden modificar principalmente:

- **Prioridad**
- **Descripción** (texto)

Además aparecen secciones extra: gestión de checklist persistido, evidencias subidas y comentarios. Esas secciones no forman parte del flujo de **creación**.

---

## Referencia técnica del schema

Campos definidos en `accionCreateSchema` (entrada del formulario):

```
fecha, titulo_accion, descripcion_modo, descripcion_simple,
descripcion_como, descripcion_quiero, descripcion_para_que,
responsable, hora_limite, evidencia_esperada, estado, prioridad,
kpi_afectado, gap_ids, catalog_kpi_ids, okr_impactado, proceso,
area, cliente_id, causa_raiz, responsable_bloqueo, tipo_accion,
story_points, sprint_id
```

Tras el `transform`, el payload incluye `descripcion_accion`, `gap_id` y `catalog_kpi_id` (primer elemento de cada lista múltiple).

**Modo descripción estructurada** (triada Cómo / Quiero / Para qué): soportado en schema (5–400 caracteres por parte) pero **no expuesto** en la UI actual; todas las acciones usan modo `simple`.

---

## Documentación relacionada

- `docs/ACCION_FORM_UX_REFACTOR.md` — historial del rediseño UX del formulario
- `docs/accion-checkpoints.md` — checklist y checkpoints
- `docs/gaps-kpis-y-acciones.md` — relación brechas / KPIs / acciones
