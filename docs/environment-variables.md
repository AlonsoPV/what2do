# Variables de entorno: frontend vs Edge Functions (secrets)

Este proyecto usa **tres superficies distintas**. No mezclar nombres ni ubicaciones evita errores típicos (p. ej. poner `VITE_*` en Supabase Secrets o intentar leer secretos de IA en el bundle de Vite).

## Tabla resumen

| Dónde se configura | Prefijo / nombres | Quién la lee | Ejemplos |
|-------------------|-------------------|--------------|----------|
| **Build del front (Vite)** | Solo `VITE_*` | Código en `import.meta.env` en el navegador | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_O2C_PROGRAM_START`, `VITE_DEV_FIXED_NOW` |
| **Secrets de Edge Functions** | **Sin** prefijo `VITE_` | `Deno.env.get(...)` dentro de `supabase/functions/` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` (si Lovable la inyecta), `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `LOVABLE_AI_MODEL`, `CHAT_DEFAULT_MODEL`, … |
| **Solo máquina local / CI (scripts Node)** | Archivo `.env` en la raíz (no Vite, no Edge) | `process.env` en `scripts/*.mjs` | `SUPABASE_URL` (recomendado), `SUPABASE_SERVICE_ROLE_KEY`, o bien reutilizar `VITE_SUPABASE_URL` como URL del proyecto para scripts que ya lo lean (fallback en código) |

## Reglas

1. **`VITE_*` = solo frontend / build**
   - Defínelas en **`.env` local**, **Vercel / Lovable / CI de build** como variables de entorno del **frontend**.
   - **Nunca** las configures como secretos de Supabase Edge (`npx supabase secrets set VITE_...`). Eso no forma parte del modelo de Vite y confunde al equipo.
   - **Nunca** commitees valores reales de producción en `.env` en git.

2. **Secrets de backend = Edge Functions (Supabase Dashboard o CLI)**
   - Nombres **sin** `VITE_`. Los consume el runtime **Deno** en las funciones, no el navegador.
   - **Nunca** añadas `SUPABASE_SERVICE_ROLE_KEY` ni claves de IA a variables `VITE_*`: quedarían empotradas en el bundle público.

3. **Coincidencia lógica entre front y Edge**
   - La URL pública del proyecto que usa el navegador (`VITE_SUPABASE_URL`) debe ser el **mismo proyecto** Supabase donde están desplegadas las funciones y sus secrets.
   - En Edge, `SUPABASE_URL` suele ser la URL del proyecto (a veces inyectada por el host); debe apuntar al mismo proyecto que el front.

4. **IA (Lovable Cloud)**
   - `LOVABLE_API_KEY` en el entorno de Edge la gestiona **Lovable**; no tratarla como variable `VITE_*` ni como valor “pegable” en documentación de equipo.

5. **Scripts de administración (`scripts/*.mjs`)**
   - Usan **`SUPABASE_SERVICE_ROLE_KEY`** y una URL de proyecto (`SUPABASE_URL` preferido, o `VITE_SUPABASE_URL` como alias en `.env` solo para comodidad local).
   - Eso **no** sustituye los secrets en Edge: son procesos aparte en tu PC o en CI.

## CLI Supabase (secrets)

**Correcto** (nombres de secretos backend, sin `VITE_`):

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set GOOGLE_MAPS_API_KEY=...
```

**Incorrecto** (Vite no corre en Edge; no usar prefijo `VITE_` en secrets):

```bash
# NO HACER — las variables VITE_* son solo build del frontend, no secrets de Supabase
npx supabase secrets set VITE_SUPABASE_URL=https://xxx.supabase.co
npx supabase secrets set VITE_SUPABASE_ANON_KEY=eyJ...
```

Para la URL y el rol de servicio en funciones desplegadas en Supabase, usa el **Dashboard → Project Settings → Edge Functions → Secrets** con nombres **`SUPABASE_URL`** y **`SUPABASE_SERVICE_ROLE_KEY`** si tu despliegue no los inyecta ya automáticamente.

## Referencias en el código

| Área | Archivo / patrón |
|------|------------------|
| Cliente Supabase | `src/lib/supabase/client.ts` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Llamadas IA desde el front | `src/features/ai-support/services/aiFunctionsClient.ts` — JWT de sesión + `apikey` anon (no claves de IA) |
| Edge: auth | `supabase/functions/_shared/requireUser.ts` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Edge: IA | `supabase/functions/_shared/lovableGateway.ts` — `LOVABLE_API_KEY`, `OPENAI_API_KEY`, etc. |
| Edge: mapas | `supabase/functions/calculate-distance/` — `GOOGLE_MAPS_API_KEY` |

## Documentos relacionados

- [Variables en Vercel](./vercel-env.md) — solo `VITE_*` en el proyecto de build.
- [Edge Functions (CLI y secrets)](./edge-functions-setup.md)
- [IA vía Edge Functions](./lovable-ai-edge-function.md)
