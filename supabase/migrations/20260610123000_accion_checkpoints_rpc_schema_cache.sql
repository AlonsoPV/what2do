-- =============================================================================
-- Checklist RPCs: publica funciones usadas por el frontend y fuerza recarga
-- de schema cache de PostgREST.
-- =============================================================================

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

NOTIFY pgrst, 'reload schema';
