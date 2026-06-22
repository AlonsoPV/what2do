-- Permite que integraciones server-side (Telegram webhook con service_role)
-- actualicen checks despues de validar permisos en el RPC dedicado.
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
  can_admin := auth.role() = 'service_role' OR public.is_app_admin() OR public.is_business_admin();

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

COMMENT ON FUNCTION public.accion_checkpoints_guard_assignee_permissions() IS
  'Controla permisos de checklist en cliente; permite service_role para callbacks server-side ya validados.';

NOTIFY pgrst, 'reload schema';
