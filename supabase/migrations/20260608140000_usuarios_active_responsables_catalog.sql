-- =============================================================================
-- Usuarios activos como catalogo de responsables.
--
-- El frontend usa public.usuarios.id/nombre/rol/area para selectores de
-- responsables, creadores, validadores y filtros. Tras mover el listado admin a
-- settings_users_list(), los usuarios sin permisos de catalogos podian quedarse
-- sin catalogo de responsables.
--
-- Esta politica permite leer perfiles activos a cualquier usuario autenticado.
-- No expone correos de auth.users; esos siguen pasando por get_auth_user_email()
-- o por settings_users_list(), ambos con permisos mas estrictos.
-- =============================================================================

DROP POLICY IF EXISTS usuarios_select_active_responsables_catalog ON public.usuarios;

CREATE POLICY usuarios_select_active_responsables_catalog ON public.usuarios
  FOR SELECT TO authenticated
  USING (activo = true);
