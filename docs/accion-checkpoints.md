# Checklist de validación (accion_checkpoints)

## Decisión de producto

- **Acción sin puntos:** permitido. Si no hay filas en `accion_checkpoints` para esa acción, **no** se exige checklist para pasar a **Hecho** (siguen aplicando evidencia y demás reglas).
- **Acción con puntos:** todos los registros **activos** deben tener `completado = true` para permitir **Hecho**.
- **Trazabilidad:** un punto ya **completado** no se puede **eliminar** ni **editar el texto** en la UI; solo se puede **desmarcar** el check (se limpian `checked_at` / `checked_by`). Así se evita reescribir historial sin dejar rastro.
- **Campo `obligatorio`:** existe en BD para escalar reglas distintas; hoy **todos** los checkpoints activos no completados bloquean **Hecho** por igual.

## Base de datos

- Tabla: `accion_checkpoints` (migración `20260313400000_accion_checkpoints.sql`).
- Trigger en `acciones_diarias`: antes de pasar a `Hecho`, si existe algún checkpoint `activo` y `completado = false`, se lanza error y se revierte el cambio.
- RLS: lectura para autenticados; escritura si el usuario es **responsable** de la acción o **admin** (`is_app_admin()`), alineado con actualización de acciones.

## Frontend

- **Crear:** sección *Puntos a validar* en el diálogo; se persisten con `insertMany` tras crear la acción.
- **Editar / seguimiento:** bloque *Checklist de validación* con barra de avance, checkboxes, auditoría básica (`checked_by` / `checked_at` en tooltip y texto); altas/bajas/reordenación en puntos **pendientes**.
- **Validación única al pasar a Hecho:** `assertCanCloseAccion` / `assertCanCloseAccionFromAccion` en `src/services/accionCloseValidation.service.ts` (evidencia + checkpoints pendientes según regla actual). Se invoca desde:
  - `useUpdateAccionEstado` (Kanban drag, menú de estado, etc.)
  - `useUpdateAccion` cuando el payload incluye `estado: 'Hecho'` (formularios u otras rutas que usen ese hook)
- **Progreso en listas:** `useChecklistProgressByAccionIds` + `AccionChecklistProgressBadge` en tarjetas Kanban y tablas (Kanban, dashboard).
- **Mapa “pendiente bloquea Hecho”:** `useCheckpointsPendingByAccionIds` reutiliza la misma query de progreso en caché (derivado de totales/completados).

## Mensaje unificado

Texto al bloquear por checkpoints (cliente y coherente con BD):

`No puedes marcar esta acción como Hecha porque aún existen puntos de validación pendientes.`

Evidencia obligatoria al cerrar:

`No se puede marcar como Hecho sin evidencia cargada.`

## Evolución: solo checks obligatorios

- En servicio: `hasPendingBlockingHecho` / `pendingBlockingHechoByAccionIds` y `assertCanCloseAccion*` aceptan opción `onlyObligatorio` / `onlyObligatorioBlocking` para una fase futura en la que solo `obligatorio = true` bloquee **Hecho**.
- Hoy no activar esa opción en producción si debe mantenerse el comportamiento actual (todos los activos incompletos bloquean).

## Mejora técnica sugerida: RPC `try_set_accion_hecho`

Para **atomicidad** y menos riesgo de condiciones de carrera (evidencia y checklist leídos en el cliente vs. estado en BD), conviene valorar un RPC o función SQL que, en una transacción, valide evidencia + checkpoints y actualice `estado` solo si todo cumple. El cliente seguiría llamando a un único endpoint; los errores serían consistentes con el trigger actual. No es obligatorio mientras el trigger siga siendo la red de seguridad.
