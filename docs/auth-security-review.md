# Revisión de Seguridad — Autenticación y Control de Acceso

## 1. Validaciones de sesión y autenticación

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Sesión al cargar** | ✅ | `AuthProvider` valida sesión con `authService.getSession()` y escucha `onAuthStateChange` |
| **Perfil de negocio** | ✅ | Tras sesión válida, se carga perfil desde `usuarios` vía `usuariosService.getByAuthId()` |
| **Usuario inactivo** | ✅ | Si `usuarios.activo = false`, se bloquea acceso y se muestra pantalla con opción de logout |
| **Perfil inexistente** | ✅ | Si no hay fila en `usuarios` para el `user_id`, se muestra error y se bloquea el dashboard |
| **Expiración de sesión** | ✅ | Supabase refresca tokens automáticamente; `onAuthStateChange` reacciona a cambios |
| **Logout** | ✅ | `authService.signOut()`, `queryClient.clear()`, `resetOnLogout()` (Zustand), redirección a `/login` |

---

## 2. Modelo de datos y asociación al usuario

**Convención:**
- `auth.users` = identidad de acceso
- `usuarios.user_id` = referencia al usuario autenticado (perfil)
- **Datos de negocio:** `created_by`, `assigned_to` (o `responsable`), `updated_by`

| Entidad | created_by | assigned_to / responsable | updated_by | Otros |
|---------|------------|---------------------------|------------|-------|
| **usuarios** | — | — | — | `user_id` → auth.users |
| **acciones_diarias** | ✅ | `responsable` | ✅ | RLS: INSERT autenticado; UPDATE/DELETE responsable o admin |
| **accion_comentarios** | ✅ | `asignado` | — | |
| **notificaciones** | — | — | — | `usuario_id` = destinatario |
| **accion_evidencias** | — | — | — | `uploaded_by` |
| **accion_historial** | — | — | — | `changed_by` |

El frontend envía `created_by` al crear acciones y `updated_by` al actualizar.

---

## 3. Rutas protegidas

Todas las rutas excepto `/login` están dentro de `ProtectedRoute`, que exige:

- Sesión de Supabase válida
- Perfil en `usuarios`
- `usuarios.activo = true`

| Ruta | Protegida | Nota |
|------|-----------|------|
| `/login` | No | Pública; redirige a dashboard si sesión + perfil válidos |
| `/`, `/dashboard`, `/kanban`, `/disciplina`, `/areas`, `/calendario`, `/reportes`, `/notificaciones`, `/manual` | Sí | Dentro de ProtectedRoute |
| `/settings/*` | Sí | Idem; acceso por rol (p. ej. Usuarios) controlado por RLS en backend |

---

## 4. Riesgos y consideraciones

| Riesgo | Mitigación actual | Pendiente |
|--------|-------------------|-----------|
| **Acceso frontend por rol** | RLS aplica en backend; Settings/Users visible a todos pero solo admins pueden listar/editar usuarios | Opcional: ocultar enlaces por rol en frontend |
| **Datos globales sin filtro** | Acciones visibles para todos los autenticados (migración 20260313200000) | Por diseño: dashboard compartido; filtros por responsable en UI |
| **Lista de usuarios para dropdowns** | `usuarios.list()` con RLS; admins ven todos | Ver Spec §17: policy puede impedir listar responsables en ciertos contextos |
| **Recuperación de contraseña** | No implementada | `auth.resetPasswordForEmail()` + flujo de reset por email |
| **Invitar usuarios** | No implementada | `auth.admin.inviteUserByEmail` (requiere service role en backend) |

---

## 5. Pendiente para RLS y permisos por rol

1. **Políticas por módulo**
   - Usar `user_role` y `app_role` para restringir SELECT/INSERT/UPDATE por vista o módulo.
   - Hoy `is_app_admin()` ya se usa; falta extender para `viewer` y roles de negocio (DG, Sistemas, etc.).

2. **Frontend**
   - Cargar `profile.rol` en `useAuth` (ya incluido).
   - Implementar guardas por ruta: p. ej. `/settings/users` solo para admins.

3. **Auditoría**
   - `acciones_diarias` ya tiene `created_by` y `updated_by` (migración 20260313240000).

4. **Secrets**
   - Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en frontend.
   - Usar solo `VITE_SUPABASE_ANON_KEY` en cliente (variables `VITE_*` = build del front; **no** como `supabase secrets set VITE_*`).
   - Tabla de referencia: [environment-variables.md](./environment-variables.md).

---

## 6. Resumen de arquitectura

```
AuthProvider (contexto global)
  ├── Session (Supabase Auth)
  ├── Profile (usuarios)
  └── Validación (activo, perfil existe)

ProtectedRoute
  └── Requiere: session + profile + activo

LoginPage
  └── Si ya logueado y perfil válido → redirect dashboard

Header
  └── Menú usuario: perfil, configuración, logout
```
