-- =============================================================================
-- Acciones: quien crea una accion tambien puede leerla.
-- Necesario para crear acciones asignadas a otro responsable sin romper el
-- RETURNING del insert ni dejar el tablero esperando un refresh manual.
-- =============================================================================

DROP POLICY IF EXISTS acciones_select_own_or_admin ON public.acciones_diarias;

CREATE POLICY acciones_select_responsable_creator_or_admin ON public.acciones_diarias
  FOR SELECT
  USING (
    responsable = public.get_my_usuario_id()
    OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
    OR public.is_app_admin()
  );
