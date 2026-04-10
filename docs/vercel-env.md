# Variables de entorno en Vercel

Sin estas variables, el build puede completarse pero las peticiones a Supabase fallan (a menudo **404** en la pestaña Red, porque el navegador llama a `tu-app.vercel.app/rest/v1/...` en lugar de `xxx.supabase.co`).

## Obligatorias

En **Vercel → tu proyecto → Settings → Environment Variables**, añade para **Production** (y **Preview** si usas ramas):

| Variable | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` (Dashboard → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Clave `anon` `public` (misma pantalla) |

**Importante:** las variables que empiezan por `VITE_` se inyectan en **tiempo de build**. Después de crear o cambiar variables, ejecuta un **nuevo deploy** (Redeploy).

## Comprobar

1. Tras el deploy, abre la app → DevTools → Red.
2. Las peticiones a Supabase deben ir a `https://*.supabase.co/rest/v1/...`, no a tu dominio de Vercel.

## Perfil / “Sin perfil”

Si la sesión existe pero no hay fila en `public.usuarios` con `user_id = auth.uid()`, la app mostrará error de perfil. Un administrador debe dar de alta el usuario o ejecutar el script de sincronización (`supabase/migrations/20260313170000_sync_usuario_from_auth.sql` adaptado al `user_id`).
