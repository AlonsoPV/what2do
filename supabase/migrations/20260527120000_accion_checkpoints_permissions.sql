-- =============================================================================
-- Acciones / checklist: alinear permisos entre acciones_diarias y checkpoints.
-- Problema corregido:
-- - Usuarios que crean una accion asignada a otra persona podian crear la accion,
--   pero no insertar su checklist por RLS en accion_checkpoints.
-- - Roles de negocio DG, Sistemas y super_admin pueden administrar acciones en UI,
--   pero algunas politicas solo miraban user_roles.app_role.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_business_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.has_business_role('DG')
    OR public.has_business_role('Sistemas')
    OR public.has_business_role('super_admin');
$$;

COMMENT ON FUNCTION public.is_business_admin() IS
  'Indica si el usuario autenticado tiene rol de negocio con privilegios admin: DG, Sistemas o super_admin.';

CREATE OR REPLACE FUNCTION public.can_manage_accion(p_accion_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
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
  'Permiso comun para editar datos dependientes de una accion: responsable, creador, admin app o admin de negocio.';

DROP POLICY IF EXISTS accion_checkpoints_insert_responsable_or_admin ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_update_responsable_or_admin ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_delete_responsable_or_admin ON public.accion_checkpoints;

CREATE POLICY accion_checkpoints_insert_manage_accion ON public.accion_checkpoints
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_accion(accion_id));

CREATE POLICY accion_checkpoints_update_manage_accion ON public.accion_checkpoints
  FOR UPDATE TO authenticated
  USING (public.can_manage_accion(accion_id))
  WITH CHECK (public.can_manage_accion(accion_id));

CREATE POLICY accion_checkpoints_delete_manage_accion ON public.accion_checkpoints
  FOR DELETE TO authenticated
  USING (public.can_manage_accion(accion_id));

DROP POLICY IF EXISTS acciones_update_responsable_creator_or_admin ON public.acciones_diarias;
DROP POLICY IF EXISTS acciones_update_own_or_admin ON public.acciones_diarias;

CREATE POLICY acciones_update_responsable_creator_or_admin ON public.acciones_diarias
  FOR UPDATE TO authenticated
  USING (
    responsable = public.get_my_usuario_id()
    OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
    OR public.is_app_admin()
    OR public.is_business_admin()
  )
  WITH CHECK (
    responsable = public.get_my_usuario_id()
    OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
    OR public.is_app_admin()
    OR public.is_business_admin()
  );

DROP POLICY IF EXISTS acciones_delete_own_or_admin ON public.acciones_diarias;

CREATE POLICY acciones_delete_own_or_admin ON public.acciones_diarias
  FOR DELETE TO authenticated
  USING (
    responsable = public.get_my_usuario_id()
    OR (created_by IS NOT NULL AND created_by = public.get_my_usuario_id())
    OR public.is_app_admin()
    OR public.is_business_admin()
  );

CREATE OR REPLACE FUNCTION acciones_diarias_guard_estado_permissions_and_audit()
RETURNS TRIGGER AS $$
DECLARE
  me uuid;
  can_admin boolean;
BEGIN
  me := public.get_my_usuario_id();
  can_admin := public.is_app_admin() OR public.is_business_admin();

  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'Hecho'::action_status THEN
      IF NOT can_admin THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden marcar esta accion como Hecha.';
        END IF;
      END IF;
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    ELSIF NEW.estado = 'Verificado'::action_status THEN
      IF NOT can_admin THEN
        IF NOT (NEW.created_by IS NOT NULL AND NEW.created_by = me) THEN
          RAISE EXCEPTION 'Solo la persona que creo esta accion puede marcarla como Verificada.';
        END IF;
      END IF;
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.verified_by := COALESCE(NEW.verified_by, me);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.estado IS DISTINCT FROM OLD.estado) THEN
    IF NOT can_admin THEN
      IF NEW.estado = 'Hecho'::action_status THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden marcar esta accion como Hecha.';
        END IF;
      END IF;

      IF NEW.estado = 'Verificado'::action_status THEN
        IF NOT (NEW.created_by IS NOT NULL AND NEW.created_by = me) THEN
          RAISE EXCEPTION 'Solo la persona que creo esta accion puede marcarla como Verificada.';
        END IF;
      END IF;
    END IF;

    IF NEW.estado = 'Hecho'::action_status AND OLD.estado IS DISTINCT FROM 'Hecho'::action_status THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    END IF;

    IF NEW.estado = 'Verificado'::action_status AND OLD.estado IS DISTINCT FROM 'Verificado'::action_status THEN
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.verified_by := COALESCE(NEW.verified_by, me);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION acciones_diarias_guard_estado_permissions_and_audit() IS
  'Hecho/Verificado: permisos por creador/responsable/admin; auditoria completed_* / verified_*.';
