# Cómo usar las Edge Functions (Supabase)

## Frontend vs secrets (no mezclar)

| Ubicación | Qué configurar |
|-----------|----------------|
| **Vite / Vercel / Lovable (build)** | Solo `VITE_*` — URL pública de Supabase y clave `anon`. |
| **Supabase → Edge Functions → Secrets** (o `supabase secrets set ...`) | Nombres **sin** `VITE_`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY`, `OPENAI_API_KEY`, etc. |

**Nunca** ejecutes algo como `supabase secrets set VITE_SUPABASE_URL=...` o `VITE_SUPABASE_ANON_KEY=...`: el prefijo `VITE_` es solo del bundle del navegador.

Tabla y reglas: [environment-variables.md](./environment-variables.md).

## Requisitos

1. **Supabase CLI** instalado:
   ```bash
   npm install -g supabase
   ```
   O con scoop (Windows): `scoop install supabase`

2. **Proyecto vinculado**: desde la raíz del repo:
   ```bash
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   ```
   El `project-ref` lo ves en Supabase → Project Settings → General → Reference ID.

---

## Desplegar la función `calculate-distance`

1. En la raíz del proyecto:
   ```bash
   supabase functions deploy calculate-distance
   ```

2. Configurar el secret de Google (solo la primera vez) — **nombre sin `VITE_`**:
   ```bash
   supabase secrets set GOOGLE_MAPS_API_KEY=tu_api_key_de_google
   ```
   O en el Dashboard: **Project Settings** → **Edge Functions** → **Secrets** → Add `GOOGLE_MAPS_API_KEY`.

3. La app ya llama a la función con `supabase.functions.invoke('calculate-distance', { body: ... })`; el cliente envía el token de sesión automáticamente.

---

## Probar en local (opcional)

```bash
supabase functions serve calculate-distance
```

En otro terminal, con un token de sesión válido:

```bash
curl -X POST http://localhost:54321/functions/v1/calculate-distance \
  -H "Authorization: Bearer TU_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"origen_ubicacion\":\"Ciudad de México\",\"destino_ubicacion\":\"Monterrey\"}"
```

Para tener JWT de prueba: en la app, inicia sesión y en la consola del navegador ejecuta  
`(await supabase.auth.getSession()).data.session?.access_token`.

---

## Otra función: `invite-user`

Se despliega igual:

```bash
supabase functions deploy invite-user
```

Esa función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en runtime Edge; en muchos proyectos Supabase ya los inyecta. Si una función devuelve *Configuración de servidor incompleta*, revisa **Edge Functions → Secrets**. No confundir con variables `VITE_*` del frontend.
