# Flujos de autenticación (Supabase + `usuarios`)

Este proyecto usa **Supabase Auth** (`auth.users`) y una **ficha de negocio** en **`public.usuarios`** (`user_id` → `auth.users.id`). En la interfaz hablamos de **ficha** o **cuenta en el tablero**, no de tablas ni de JWT frente al usuario final.

## Criterio de tono (UX writing)

- **Tú** de forma consistente (no mezclar con usted en la misma pantalla).
- **Profesional, claro y cercano**: frases cortas; siguiente paso cuando ayuda (reintentar, pedir ayuda a administración, revisar correo).
- **“Correo”** en etiquetas y mensajes; evitar “email” salvo en textos técnicos de documentación.
- **Sin culpar** al usuario; los errores explican qué pasó y qué puede hacer.
- **Sin detalles técnicos** en pantallas (nombres de variables, nombres de tablas, trazas). Lo operativo va en documentación para quien despliega.

## Sesión vs ficha vs permisos

| Qué falla | Qué ve el usuario | Qué puede hacer |
|-----------|-------------------|-----------------|
| **Sesión** (sin login, token inválido, red al validar) | Mensajes de acceso, “sin conexión”, o vuelve al inicio de sesión | Reintentar, revisar red, volver a entrar con correo y contraseña |
| **Ficha incompleta** (hay sesión pero no fila en `usuarios` o no carga) | Pantalla o bloque “ficha pendiente” / error al cargar perfil | Pedir a un administrador que revise el alta en **Usuarios** |
| **Cuenta desactivada** (`activo = false`) | Pantalla “cuenta desactivada” con el mensaje de contexto | Esperar a que un administrador reactive la cuenta |
| **Permisos de administración** (p. ej. invitar) | Mensaje al invitar o al usar acciones de admin | Volver a iniciar sesión si la sesión caducó; quien administra la plataforma valida roles |

## Variables de entorno (solo despliegue; no mostrar en UI)

Referencias: [environment-variables.md](./environment-variables.md) (tabla frontend vs Edge vs scripts).

| Variable | Dónde | Uso |
|----------|-------|-----|
| `VITE_SUPABASE_URL` | Build Vite (`.env` local, Vercel, Lovable, etc.) | URL del proyecto Supabase en el navegador |
| `VITE_SUPABASE_ANON_KEY` | Build Vite | Clave pública `anon` del cliente |
| `VITE_APP_URL` | Build Vite | URL base del sitio (p. ej. producción en Vercel). Importante para que el enlace del correo de recuperación lleve a `/reset-password`. Si falta, en desarrollo suele usarse `window.location.origin`. |

No commitear `service_role` en el frontend. Los secrets de Edge (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.) se configuran **solo** en Supabase Edge, no como `VITE_*`.

## Inicio de sesión

1. El usuario entra con **correo y contraseña** (`signInWithPassword`).
2. **`AuthContext`** comprueba la sesión y carga la ficha con `usuariosService.getByAuthId`.
3. Tras un login correcto se llama **`refetch('SIGNED_IN')`** antes de navegar para evitar carreras con rutas protegidas.
4. Si todo es válido y la cuenta está activa, se redirige al dashboard y un toast confirma **sesión iniciada**.

## Recuperación de contraseña

1. **¿Olvidaste tu contraseña?** (`/forgot-password`): se envía un correo con `resetPasswordForEmail` y `redirectTo` = `{app}/reset-password`.
2. El usuario abre el enlace; el cliente recupera la sesión desde la URL (**`detectSessionInUrl`**).
3. **`/reset-password`**: con sesión de recuperación válida, `updateUser({ password })`, cierre de sesión y vuelta al inicio de sesión.
4. Mensajes genéricos del tipo “si ese correo está registrado…” para no filtrar si existe o no la cuenta.

Se puede prellenar el correo con `?email=` (por ejemplo desde administración).

## Cambio de contraseña (ya dentro de la app)

En **Mi perfil** (**Cambiar contraseña**): contraseña actual + nueva + confirmación. Implementación: comprobación con la actual y luego `updateUser` (ver `auth.service.ts`).

## Alta e invitación (administración)

1. Quien tenga permiso abre **Usuarios** y usa **Invitar usuario** → **Enviar invitación**.
2. El cliente llama a la Edge Function **`invite-user`** con el JWT del administrador.
3. La función usa `auth.admin.inviteUserByEmail` con metadatos (nombre, rol, área, …).
4. El trigger **`handle_new_user`** crea la fila en **`usuarios`** al crearse el usuario en Auth.
5. La persona invitada recibe el **correo de Supabase** para definir contraseña y puede iniciar sesión.

Si el correo **ya tiene cuenta**, la interfaz muestra un mensaje claro y se sugiere revisar el listado o usar otro correo. Si hay fallo de servidor o permisos, el mensaje orienta a reintentar o contactar a quien administra el sistema.

## Cierre de sesión

`logout` en contexto: `signOut`, limpieza de caché de consultas, evento `auth:logout`. En el encabezado: **Cerrar sesión**.

## Timers, bootstrap y qué **no** hace el frontend

| Dónde | Qué hace | Qué **no** hace |
|-------|----------|-----------------|
| **`AuthContext` (`loadAuth`)** | En el **arranque**, la sesión entra con `onAuthStateChange` (`INITIAL_SESSION`, etc.) usando el `session` del callback — **sin** llamar a `getSession()` en el primer tick (evita carrera con `_initialize` de GoTrue). En **refetch** (login, Reintentar), sí usa `getSession()` con `Promise.race` (~20 s) por si la promesa no resuelve. | **No** llama a `signOut`. Tras timeout de `getSession()`, **Reintentar** o recargar vuelve a ejecutar `loadAuth`. |
| **`/reset-password`** | Polling cada 400 ms + tope de espera (60 s) para pasar de “validando enlace” al formulario cuando la sesión recovery aparece en el cliente | **No** es la caducidad del enlace del correo (eso lo decide Supabase). Si el tope se alcanza sin sesión, se muestra pantalla de enlace inválido/caducado; recargar puede ayudar si el token era válido pero lento. |
| **Resto del flujo auth** | Sin `setTimeout` / `setInterval` | Sin logout por inactividad, sin comparar `expires_at` a mano, sin limpiar `localStorage` de auth salvo `signOut` explícito |

**Errores de red vs sesión:** `ProtectedRoute` con `error.type === 'network'` no redirige al login: muestra **Reintentar** (`refetch`) sin asumir sesión inválida. Tras login, si `refetch` devuelve error de red, tampoco se llama a `logout`.

**Logout explícito tras login** solo cuando la cuenta no puede usar el tablero por negocio (`no_profile` o `user_inactive`), para volver a la pantalla de acceso con mensaje claro.

## Decisiones de UX writing (resumen)

- Un solo registro (**tú**), un solo término para el contacto (**correo**), CTAs alineados: **Iniciar sesión**, **Volver al inicio de sesión**, **Enviar enlace**, **Cambiar contraseña** / **Guardar**, **Enviar invitación**.
- Errores de red o timeout: sin nombres de variables; invitar a **recargar**, **reintentar** o **avisar a administración**.
- Perfil: mensajes de error **sin bloques técnicos** para el usuario final; la reparación fina queda en documentación (`troubleshooting-perfil`, etc.).
