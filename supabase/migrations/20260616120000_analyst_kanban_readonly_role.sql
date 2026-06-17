-- =============================================================================
-- Rol Analista:
-- - Solo ve acciones donde es responsable.
-- - No puede crear, actualizar ni eliminar acciones.
-- - No puede modificar checklist.
-- =============================================================================

UPDATE public.catalog_roles
SET
  descripcion = 'Acceso de solo lectura a Kanban; ve únicamente acciones asignadas y no crea acciones.',
  activo = true,
  updated_at = now()
WHERE lower(trim(nombre)) = lower('Analista');

INSERT INTO public.catalog_roles (nombre, descripcion, activo)
SELECT
  'Analista',
  'Acceso de solo lectura a Kanban; ve únicamente acciones asignadas y no crea acciones.',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalog_roles
  WHERE lower(trim(nombre)) = lower('Analista')
);

CREATE OR REPLACE FUNCTION public.is_business_analyst()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_business_role('Analista');
$$;

COMMENT ON FUNCTION public.is_business_analyst() IS
  'Indica si el usuario autenticado tiene rol de negocio Analista.';

DROP POLICY IF EXISTS acciones_select_authenticated ON public.acciones_diarias;
DROP POLICY IF EXISTS acciones_select_own_or_admin ON public.acciones_diarias;
DROP POLICY IF EXISTS acciones_select_responsable_creator_or_admin ON public.acciones_diarias;
DROP POLICY IF EXISTS acciones_select_role_scoped ON public.acciones_diarias;

CREATE POLICY acciones_select_role_scoped ON public.acciones_diarias
  FOR SELECT TO authenticated
  USING (
    auth.role() = 'authenticated'
    AND (
      NOT public.is_business_analyst()
      OR responsable = public.get_my_usuario_id()
    )
  );

DROP POLICY IF EXISTS acciones_insert_authenticated ON public.acciones_diarias;
DROP POLICY IF EXISTS acciones_insert_non_analyst ON public.acciones_diarias;

CREATE POLICY acciones_insert_non_analyst ON public.acciones_diarias
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
    AND NOT public.is_business_analyst()
  );

DROP POLICY IF EXISTS acciones_update_own_or_admin ON public.acciones_diarias;
DROP POLICY IF EXISTS acciones_update_responsable_creator_or_admin ON public.acciones_diarias;

CREATE POLICY acciones_update_responsable_creator_or_admin ON public.acciones_diarias
  FOR UPDATE TO authenticated
  USING (
    NOT public.is_business_analyst()
    AND (
      responsable = public.get_my_usuario_id()
      OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
      OR public.is_app_admin()
      OR public.is_business_admin()
    )
  )
  WITH CHECK (
    NOT public.is_business_analyst()
    AND (
      responsable = public.get_my_usuario_id()
      OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
      OR public.is_app_admin()
      OR public.is_business_admin()
    )
  );

DROP POLICY IF EXISTS acciones_delete_own_or_admin ON public.acciones_diarias;

CREATE POLICY acciones_delete_own_or_admin ON public.acciones_diarias
  FOR DELETE TO authenticated
  USING (
    NOT public.is_business_analyst()
    AND (
      responsable = public.get_my_usuario_id()
      OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
      OR public.is_app_admin()
      OR public.is_business_admin()
    )
  );

CREATE OR REPLACE FUNCTION public.can_manage_accion(p_accion_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    NOT public.is_business_analyst()
    AND EXISTS (
      SELECT 1
      FROM public.acciones_diarias a
      WHERE a.id = p_accion_id
        AND (
          a.responsable = public.get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = public.get_my_usuario_id())
          OR public.is_app_admin()
          OR public.is_business_admin()
        )
    );
$$;

COMMENT ON FUNCTION public.can_manage_accion(uuid) IS
  'Permiso comun para editar datos dependientes de una accion; Analista queda en solo lectura.';

CREATE OR REPLACE FUNCTION public.can_contribute_accion_checklist(p_accion_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    NOT public.is_business_analyst()
    AND EXISTS (
      SELECT 1
      FROM public.acciones_diarias a
      WHERE a.id = p_accion_id
        AND (
          a.responsable = public.get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = public.get_my_usuario_id())
          OR public.is_app_admin()
          OR public.is_business_admin()
        )
    );
$$;

COMMENT ON FUNCTION public.can_contribute_accion_checklist(uuid) IS
  'Permite aportar al checklist salvo para Analista, que solo puede visualizar.';

DROP POLICY IF EXISTS accion_checkpoints_select_authenticated ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_select_role_scoped ON public.accion_checkpoints;

CREATE POLICY accion_checkpoints_select_role_scoped ON public.accion_checkpoints
  FOR SELECT TO authenticated
  USING (
    auth.role() = 'authenticated'
    AND (
      NOT public.is_business_analyst()
      OR EXISTS (
        SELECT 1
        FROM public.acciones_diarias a
        WHERE a.id = accion_checkpoints.accion_id
          AND a.responsable = public.get_my_usuario_id()
      )
    )
  );

NOTIFY pgrst, 'reload schema';
