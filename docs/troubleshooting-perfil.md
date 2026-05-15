# Perfil: «No se pudo cargar» / sin fila en `usuarios`

## 1. Error 404 en red (Vercel)

El frontend debe apuntar al **mismo** proyecto Supabase donde está la base.

1. **Vercel** → proyecto → **Settings → Environment Variables**
2. Comprueba `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (valores del panel Supabase → **Project Settings → API**). Son variables **solo del build del front**; no confundir con secretos de Edge Functions (ver [environment-variables.md](./environment-variables.md)).
3. **Redeploy** tras cambiar variables (`VITE_*` se inyectan en build).

## 2. Sesión OK pero «no hay fila en usuarios»

- Tras registrarse debería ejecutarse el trigger **`on_auth_user_created`** → función **`handle_new_user()`**, que inserta en `public.usuarios`.
- Si el trigger falló (p. ej. por un `rol` en metadata que no encajaba con el enum), el usuario existe en **Auth** pero **no** en **`usuarios`**.

**Corrección en el proyecto (nuevos registros):** aplica la migración `20260313350000_handle_new_user_rol_text.sql` (`rol` como **text**, sin cast a `user_role`).

**Corrección para una cuenta ya rota:** en Supabase **SQL Editor**, adapta y ejecuta `scripts/fix-profile-by-email.sql` (cambia `v_email` al correo del usuario). Eso crea la fila en `usuarios` y deja `viewer` en `user_roles` si faltaba.

## 3. Comprobar el trigger

En **Supabase → Database → Functions** (o SQL): revisa que exista `handle_new_user` y en **Auth** no haya errores recientes al crear usuarios (logs / **Authentication**).

## 4. Referencia en la app

Los textos de ayuda en **Mi perfil** y en **Auth** alinearán Vercel + administrador según el tipo de error (red vs perfil ausente).
