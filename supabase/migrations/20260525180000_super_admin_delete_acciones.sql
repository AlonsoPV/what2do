-- =============================================================================
-- Super admin: permiso explicito para borrar acciones.
-- Mantiene el borrado por responsable y por admin de app existente.
-- =============================================================================

DROP POLICY IF EXISTS acciones_delete_own_or_admin ON public.acciones_diarias;

CREATE POLICY acciones_delete_own_or_admin ON public.acciones_diarias
  FOR DELETE
  USING (
    responsable = public.get_my_usuario_id()
    OR public.is_app_admin()
    OR public.has_business_role('super_admin')
  );

COMMENT ON POLICY acciones_delete_own_or_admin ON public.acciones_diarias IS
  'Permite borrar acciones al responsable, admins de app y usuarios con rol de negocio super_admin.';
