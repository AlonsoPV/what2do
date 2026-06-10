-- =============================================================================
-- Checklist: el responsable asignado puede marcar checks y agregar puntos,
-- pero no editar/eliminar puntos existentes ni campos estructurales.
--
-- Regla:
-- - Creador de la accion / admins: pueden administrar el checklist.
-- - Responsable asignado: puede insertar puntos nuevos y cambiar solo
--   completado, checked_at y checked_by.
-- - Los puntos creados al crear la accion se atribuyen al creador.
-- =============================================================================

ALTER TABLE public.accion_checkpoints
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.normalize_business_role(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    translate(
      trim(coalesce(p_role, '')),
      U&'\00E1\00E9\00ED\00F3\00FA\00FC\00F1',
      'aeiouun'
    )
  );
$$;

COMMENT ON FUNCTION public.normalize_business_role(text) IS
  'Normaliza roles de negocio para comparar sin acentos y sin espacios.';

CREATE OR REPLACE FUNCTION public.has_business_role(p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.user_id = auth.uid()
      AND public.normalize_business_role(u.rol::text) = public.normalize_business_role(p_role)
      AND u.activo = true
  );
$$;

COMMENT ON FUNCTION public.has_business_role(text) IS
  'Indica si el usuario autenticado tiene un rol de negocio activo en public.usuarios.';

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

CREATE OR REPLACE FUNCTION public.is_accion_creator(p_accion_id uuid)
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
      AND a.created_by IS NOT NULL
      AND a.created_by = public.get_my_usuario_id()
  );
$$;

COMMENT ON FUNCTION public.is_accion_creator(uuid) IS
  'Indica si el usuario autenticado es la persona creadora de la accion.';

UPDATE public.accion_checkpoints c
SET created_by = a.created_by
FROM public.acciones_diarias a
WHERE a.id = c.accion_id
  AND c.created_by IS NULL;

COMMENT ON COLUMN public.accion_checkpoints.created_by IS
  'usuarios.id que creo el punto del checklist; usado para permisos estructurales.';

CREATE OR REPLACE FUNCTION public.can_contribute_accion_checklist(p_accion_id uuid)
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

COMMENT ON FUNCTION public.can_contribute_accion_checklist(uuid) IS
  'Permite aportar al checklist: responsable, creador, admin app o admin de negocio. El trigger limita que puede cambiar cada rol.';

DROP POLICY IF EXISTS accion_checkpoints_insert_creator ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_update_creator ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_delete_creator ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_insert_manage_accion ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_update_manage_accion ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_delete_manage_accion ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_insert_contributor ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_update_contributor ON public.accion_checkpoints;
DROP POLICY IF EXISTS accion_checkpoints_delete_creator_admin ON public.accion_checkpoints;

CREATE POLICY accion_checkpoints_insert_contributor ON public.accion_checkpoints
  FOR INSERT TO authenticated
  WITH CHECK (public.can_contribute_accion_checklist(accion_id));

CREATE POLICY accion_checkpoints_update_contributor ON public.accion_checkpoints
  FOR UPDATE TO authenticated
  USING (public.can_contribute_accion_checklist(accion_id))
  WITH CHECK (public.can_contribute_accion_checklist(accion_id));

CREATE POLICY accion_checkpoints_delete_creator_admin ON public.accion_checkpoints
  FOR DELETE TO authenticated
  USING (
    public.is_app_admin()
    OR public.is_business_admin()
    OR public.is_accion_creator(accion_id)
  );

CREATE OR REPLACE FUNCTION public.accion_checkpoints_guard_assignee_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  action_creator uuid;
  action_responsable uuid;
  can_admin boolean;
BEGIN
  me := public.get_my_usuario_id();
  can_admin := public.is_app_admin() OR public.is_business_admin();

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := me;
    END IF;
    RETURN NEW;
  END IF;

  SELECT a.created_by, a.responsable
  INTO action_creator, action_responsable
  FROM public.acciones_diarias a
  WHERE a.id = OLD.accion_id;

  IF can_admin OR (action_creator IS NOT NULL AND action_creator = me) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Solo la persona creadora de la accion puede eliminar puntos del checklist.';
  END IF;

  IF action_responsable IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden actualizar este checklist.';
  END IF;

  IF NEW.accion_id IS DISTINCT FROM OLD.accion_id
    OR NEW.texto IS DISTINCT FROM OLD.texto
    OR NEW.orden IS DISTINCT FROM OLD.orden
    OR NEW.obligatorio IS DISTINCT FROM OLD.obligatorio
    OR NEW.activo IS DISTINCT FROM OLD.activo
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'El responsable asignado solo puede marcar o desmarcar puntos del checklist.';
  END IF;

  IF NEW.completado IS NOT DISTINCT FROM OLD.completado
    AND (
      NEW.checked_at IS DISTINCT FROM OLD.checked_at
      OR NEW.checked_by IS DISTINCT FROM OLD.checked_by
    )
  THEN
    RAISE EXCEPTION 'El responsable asignado solo puede actualizar auditoria al marcar o desmarcar puntos.';
  END IF;

  IF NEW.completado = true AND OLD.completado IS DISTINCT FROM true THEN
    NEW.checked_at := now();
    NEW.checked_by := me;
  ELSIF NEW.completado = false AND OLD.completado IS DISTINCT FROM false THEN
    NEW.checked_at := NULL;
    NEW.checked_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_accion_checkpoint_completado(
  p_checkpoint_id uuid,
  p_completado boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  v_accion_id uuid;
  v_creator uuid;
  v_responsable uuid;
  can_admin boolean;
BEGIN
  me := public.get_my_usuario_id();
  can_admin := public.is_app_admin() OR public.is_business_admin();

  SELECT c.accion_id, a.created_by, a.responsable
  INTO v_accion_id, v_creator, v_responsable
  FROM public.accion_checkpoints c
  JOIN public.acciones_diarias a ON a.id = c.accion_id
  WHERE c.id = p_checkpoint_id
    AND c.activo = true;

  IF v_accion_id IS NULL THEN
    RAISE EXCEPTION 'Punto de checklist no encontrado o inactivo.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    can_admin
    OR (v_creator IS NOT NULL AND v_creator = me)
    OR v_responsable = me
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para marcar este punto del checklist.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.accion_checkpoints
  SET
    completado = p_completado,
    checked_at = CASE WHEN p_completado THEN now() ELSE NULL END,
    checked_by = CASE WHEN p_completado THEN me ELSE NULL END
  WHERE id = p_checkpoint_id;
END;
$$;

COMMENT ON FUNCTION public.set_accion_checkpoint_completado(uuid, boolean) IS
  'Marca/desmarca un punto del checklist validando creador, responsable asignado o admin. No permite editar estructura.';

GRANT EXECUTE ON FUNCTION public.set_accion_checkpoint_completado(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_accion_checkpoint(
  p_accion_id uuid,
  p_texto text,
  p_orden integer,
  p_obligatorio boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
BEGIN
  me := public.get_my_usuario_id();

  IF me IS NULL THEN
    RAISE EXCEPTION 'No autorizado.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_contribute_accion_checklist(p_accion_id) THEN
    RAISE EXCEPTION 'No tienes permiso para agregar puntos al checklist de esta accion.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.accion_checkpoints (
    accion_id,
    texto,
    orden,
    obligatorio,
    created_by,
    activo,
    completado
  )
  VALUES (
    p_accion_id,
    btrim(coalesce(p_texto, '')),
    coalesce(p_orden, 0),
    coalesce(p_obligatorio, true),
    me,
    true,
    false
  );
END;
$$;

COMMENT ON FUNCTION public.add_accion_checkpoint(uuid, text, integer, boolean) IS
  'Agrega un punto de checklist validando creador, responsable asignado o admin; atribuye el punto al usuario autenticado.';

GRANT EXECUTE ON FUNCTION public.add_accion_checkpoint(uuid, text, integer, boolean) TO authenticated;

DROP TRIGGER IF EXISTS accion_checkpoints_guard_assignee_permissions_trigger
  ON public.accion_checkpoints;

CREATE TRIGGER accion_checkpoints_guard_assignee_permissions_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.accion_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.accion_checkpoints_guard_assignee_permissions();
