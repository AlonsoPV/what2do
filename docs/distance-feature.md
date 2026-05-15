# Módulo de distancias (Google Routes API)

## Resumen

El tablero incluye un módulo para calcular distancias entre **orígenes y destinos de catálogo**, usando **Google Routes API** (Compute Routes). La API key de Google **no se expone en el frontend**: la llamada se hace desde una **Supabase Edge Function**. El flujo prioriza **rutas ya guardadas** para no llamar a la API si no hace falta.

### Desplegar la Edge Function `calculate-distance`

Si en el navegador ves **404** en `.../functions/v1/calculate-distance`, la función **no está desplegada** en ese proyecto de Supabase.

1. Instala/usa la CLI: `npx supabase@latest login` y `npx supabase@latest link --project-ref <tu_ref>`.
2. Desde la raíz del repo: **`npm run supabase:deploy`** (equivale a `functions deploy calculate-distance`).
3. En **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, define (nombres **sin** `VITE_`):
   - `GOOGLE_MAPS_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` si tu proyecto no la inyecta automáticamente (la función también usa `SUPABASE_URL` del entorno Edge).

Ver [environment-variables.md](./environment-variables.md) (frontend vs secrets).

Para desplegar también `invite-user`: **`npm run supabase:deploy:all`**.

Si aparece **«Origen no encontrado»** con la función ya desplegada: sincroniza **`distance_places`** ejecutando en SQL Editor **`scripts/repair-distance-places.sql`**, luego vuelve a desplegar **`calculate-distance`** (la última versión resuelve lugares por `distance_places`, catálogos viejos y snapshots de `saved_route_requests`).

**Comprobar que el deploy es el correcto:** cada respuesta JSON de la función incluye **`revision`** (p. ej. `calculate-distance-2026-03-18-rev5`). En el navegador → Red → petición `calculate-distance` → **Response**: si **no** ves ese campo o el valor es viejo, la app está llamando a **otro proyecto** Supabase o el deploy no actualizó esa función. Compara **`VITE_SUPABASE_URL`** de Vercel/.env con el proyecto donde desplegaste en el Dashboard.

---

## Nueva lógica (saved_route_requests)

1. **Consultar:** El usuario elige origen y destino. El sistema busca en **saved_route_requests** por dirección exacta (origin_id, destination_id, route_mode). A→B y B→A se consultan por separado.
2. **Si existe ruta guardada:** Se muestra el kilometraje y la duración aprox. con el mensaje *"Ruta encontrada en solicitudes guardadas"*. **No se llama a la Edge Function ni a Google.**
3. **Si no existe:** Se habilita **"Calcular kilometraje"**. Al pulsar, se llama a la Edge Function (que a su vez usa `distance_catalog` o Google). Se muestra ida, vuelta y total con *"Ruta calculada exitosamente, puedes guardarla"*.
4. **Guardado manual:** El usuario decide si pulsa **"Guardar ruta calculada"**. Al guardar se insertan **dos registros** en `saved_route_requests`: uno para origen→destino (km_ida) y otro para destino→origen (km_vuelta). No hay guardado automático al calcular.
5. **Reutilización:** En futuras solicitudes con el mismo par, el lookup devuelve la ruta guardada y no se llama a la API.

### Cómo se evita llamar de más a la API

- **Primero** se consulta `saved_route_requests` (por origin_id, destination_id, route_mode). Si hay fila activa, se usa ese valor y no se invoca la Edge Function.
- **Solo** si no hay ruta guardada se permite "Calcular kilometraje", que llama a la Edge Function. La Edge Function sigue usando `distance_catalog` como caché interno (si ya calculó ese par antes, devuelve sin llamar a Google).

### Cómo se guardan las rutas

- Una **dirección** = una fila en `saved_route_requests` (origin_id, destination_id, distance_km, duration_seconds, snapshots, etc.).
- **Un guardado del usuario** crea **dos filas**: A→B (con km de ida) y B→A (con km de vuelta). Así se puede consultar en ambos sentidos sin recalcular.
- Unicidad: `UNIQUE (origin_id, destination_id, route_mode)`. Al guardar se usa upsert para no duplicar y actualizar si ya existía.

### Validación del botón **Recalcular** (tabla de rutas guardadas)

**Automática (repo):** `npm run build` y `npx eslint "src/features/distance/**/*.{ts,tsx}"` deben pasar sin errores.

**Manual (entorno con función desplegada y sesión válida):**

1. Ir a **Distancias** (o **Rutas guardadas**) con al menos un par guardado (ida + vuelta).
2. Abrir **Red** (DevTools) → pulsar **Recalcular** en una fila.
3. Debe aparecer **`calculate-distance`** (POST): respuesta `ok: true` con `km_ida`, `km_vuelta`, `revision` acorde al deploy.
4. Debe seguir **`saved_route_requests`** (upsert vía cliente): sin error 4xx/5xx.
5. Toast **«Ruta recalculada y guardada»** y la tabla debe refrescar con km actualizados (o fechas `updated_at` nuevas).

**Coherencia de datos:** la fila agrupada usa como `origin_id`/`destination_id` la pierna **ida** (`origin_id < destination_id` como texto). Eso coincide con lo que envía **Recalcular** y con **`saveRouteCalculated`** (ida = A→B, vuelta = B→A).

### Quitar ruta guardada (borrado lógico)

- En la tabla hay **Quitar** → confirmación → se pone **`activo = false`** en **las dos** filas del par (A→B y B→A) con el mismo `route_mode`.
- **RLS:** no hay política `DELETE`; se reutiliza **`UPDATE` propio** (`created_by = get_my_usuario_id()`). Si el listado muestra rutas de otros usuarios, **Quitar** solo afecta las tuyas; si ninguna fila es tuya, el servicio devuelve error claro (comprueba filas devueltas por `.update(...).select('id')`).
- **Manual:** tras quitar, la fila desaparece del listado (`listSavedRoutes` filtra `activo = true`). Vuelve a calcular y guardar si quieres restaurar el par.

---

## Cambios respecto a la versión anterior

| Antes | Ahora |
|-------|--------|
| Tras calcular se podía guardar **una** solicitud en `distance_requests` (ruta, fecha, hora, km ida/vuelta/total). | El guardado es en **saved_route_requests**: **dos** filas por dirección (A→B y B→A), sin ruta/fecha/hora. |
| No había lookup previo: siempre se podía calcular. | **Primero** se consulta saved_route_requests; solo si no hay resultado se habilita Calcular. |
| Tablero listaba `distance_requests`. | Tablero y página "Rutas guardadas" listan **saved_route_requests** (una fila por dirección). |
| Mismo formulario con ruta, fecha, hora. | En el diálogo "Nueva solicitud" el formulario es **simplificado** (solo origen, destino, calcular, guardar). |

Las tablas **distance_requests** y **distance_catalog** se mantienen: `distance_catalog` como caché interno de la Edge Function; `distance_requests` por compatibilidad (el flujo principal pasa por saved_route_requests).

---

## Arquitectura

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **UI** | DistanceDashboardPage, DistanceRequestFormDialog | Botón "Nueva solicitud", diálogo con formulario simplificado (origen, destino, calcular, guardar), SavedRoutesTable |
| **Hooks** | useRouteLookup, useCalculateRoute, useSaveRoute, useDeactivateSavedRoutePair, useSavedRoutesList, useOrigins, useDestinations | Lookup, cálculo, guardado (dos filas), desactivar par, listado |
| **Servicios** | savedRoutes.service, distance.service, origins.service, destinations.service | lookupSavedRoute, saveRouteCalculated, listSavedRoutes, deactivateSavedRoutePair; calculateRoute; orígenes/destinos |
| **Backend** | Edge Function `calculate-distance` | Recibe origin_id/destination_id; consulta distance_catalog; si no hay hit, Google (ida + vuelta); escribe en distance_catalog; **no** escribe en saved_route_requests |
| **BD** | distance_origins, distance_destinations, distance_catalog, **saved_route_requests** | Catálogos base; caché interno de la API; **rutas guardadas por el usuario (una fila por dirección)** |

---

## Tablas

- **distance_origins** / **distance_destinations**: catálogos de orígenes y destinos (nombre, ubicacion, activo). RLS: lectura todos; escritura admins.
- **distance_catalog**: caché de la Edge Function (una fila por par con km_ida, km_vuelta, km_total). Solo la Edge Function escribe. El frontend no lee esta tabla para "¿ya guardado?".
- **saved_route_requests**: rutas guardadas por el usuario. Una fila por **dirección** (origin_id, destination_id, route_mode). Campos: snapshots, distance_km, distance_meters, duration_seconds, route_mode, api_source, created_by, created_at, updated_at, activo. UNIQUE (origin_id, destination_id, route_mode). RLS: SELECT usuarios autenticados; INSERT/UPDATE con created_by = usuario actual.
- **distance_requests**: se mantiene por compatibilidad; el flujo principal de "solicitudes guardadas" usa saved_route_requests.

---

## Validaciones

- Origen y destino **obligatorios** y no vacíos (incl. rechazo del valor sentinel del select).
- Origen **≠** destino (validación en schema Zod).
- No se puede guardar sin un **resultado de cálculo** reciente (km_ida, km_vuelta); si el valor mostrado viene solo del lookup, el botón "Guardar ruta calculada" no está habilitado.
- En BD: unicidad (origin_id, destination_id, route_mode); upsert al guardar para no duplicar.

---

## UX / Mensajes

- *"Ruta encontrada en solicitudes guardadas."* — Valor mostrado viene del lookup en saved_route_requests.
- *"Ruta calculada exitosamente, puedes guardarla."* — Valor viene de la Edge Function; se habilita "Guardar ruta calculada".
- *"Ruta guardada correctamente."* — Tras guardar las dos filas en saved_route_requests.

---

## Configuración

- **Edge Function:** Secret `GOOGLE_MAPS_API_KEY` en Supabase. Despliegue: `npm run supabase:deploy`.
- **Migraciones:** Incluyen `20260313320003_saved_route_requests.sql` (tabla y RLS). Ejecutar `supabase db push` o aplicar en el SQL Editor.

---

## Recomendaciones para siguiente fase

- **Recalcular ruta:** Botón "Recalcular ruta" para un par ya guardado: llamar a la Edge Function y actualizar las dos filas en saved_route_requests (p. ej. con `updated_at`).
- **Timestamp de último cálculo:** Usar `updated_at` o añadir `last_calculated_at` para mostrar cuándo se calculó por última vez.
- **Uso de coordenadas:** Campos lat/long en orígenes y destinos; usar en la Edge Function para mayor precisión.
- **Indicador visual:** Ya implementado (sourceLabel: 'saved' | 'calculated').
- **distance_requests:** Decidir si se depreca por completo o se mantiene para un historial con ruta/fecha/hora aparte.
