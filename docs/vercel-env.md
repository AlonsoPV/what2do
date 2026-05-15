# Variables de entorno en Vercel

Solo configura aquí las variables del **build de Vite** (prefijo `VITE_*`). Los **secrets** de Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`, etc.) van en **Supabase → Edge Functions → Secrets**, nunca en Vercel y **nunca** con prefijo `VITE_`.

Guía general: [environment-variables.md](./environment-variables.md).

Sin las `VITE_*` obligatorias, el build puede completarse pero las peticiones a Supabase fallan (a menudo **404** en la pestaña Red, porque el navegador llama a `tu-app.vercel.app/rest/v1/...` en lugar de `xxx.supabase.co`).

## Obligatorias (solo frontend)

En **Vercel → tu proyecto → Settings → Environment Variables**, añade para **Production** (y **Preview** si usas ramas):

| Variable | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` (Dashboard → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Clave `anon` `public` (misma pantalla) |

**Importante:** las variables que empiezan por `VITE_` se inyectan en **tiempo de build**. Después de crear o cambiar variables, ejecuta un **nuevo deploy** (Redeploy).

**Incorrecto:** `npx supabase secrets set VITE_SUPABASE_URL=...` — Supabase Secrets no son para variables Vite; y no copies `service_role` a Vercel.

## Comprobar

1. Tras el deploy, abre la app → DevTools → Red.
2. Las peticiones a Supabase deben ir a `https://*.supabase.co/rest/v1/...`, no a tu dominio de Vercel.

## Perfil / “Sin perfil”

Si la sesión existe pero no hay fila en `public.usuarios` con `user_id = auth.uid()`, la app mostrará error de perfil. Un administrador debe dar de alta el usuario o ejecutar el script de sincronización (`supabase/migrations/20260313170000_sync_usuario_from_auth.sql` adaptado al `user_id`).
