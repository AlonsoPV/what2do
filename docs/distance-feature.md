# Módulo de distancias (Google Routes API)

## Resumen

El tablero incluye un módulo para calcular distancias entre **orígenes y destinos de catálogo**, usando **Google Routes API** (Compute Routes). La API key de Google **no se expone en el frontend**: la llamada se hace desde una **Supabase Edge Function**. El flujo prioriza **rutas ya guardadas** para no llamar a la API si no hace falta.

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
| **Hooks** | useRouteLookup, useCalculateRoute, useSaveRoute, useSavedRoutesList, useOrigins, useDestinations | Lookup en saved_route_requests, cálculo vía Edge Function, guardado (dos filas), listado para tablero |
| **Servicios** | savedRoutes.service, distance.service, origins.service, destinations.service | lookupSavedRoute, saveRouteCalculated, listSavedRoutes; calculateRoute (Edge Function); orígenes/destinos |
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
