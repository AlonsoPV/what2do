-- =============================================================================
-- Estatus de acciones: 4 columnas Kanban
--   En_Pausa | En_Proceso | Completada | Retrasa
-- Migra valores legacy del enum action_status y actualiza funciones/triggers.
-- =============================================================================

BEGIN;

CREATE TYPE public.action_status_new AS ENUM (
  'En_Pausa',
  'En_Proceso',
  'Completada',
  'Retrasa'
);

-- Triggers con UPDATE OF estado bloquean ALTER COLUMN TYPE; funciones legacy
-- referencian el enum viejo y bloquean DROP TYPE.
DROP TRIGGER IF EXISTS acciones_diarias_block_hecho_checkpoints ON public.acciones_diarias;
DROP TRIGGER IF EXISTS acciones_diarias_block_hecho_evidencia ON public.acciones_diarias;
DROP TRIGGER IF EXISTS acciones_diarias_guard_estado_permissions_and_audit ON public.acciones_diarias;

ALTER TABLE public.acciones_diarias
  ALTER COLUMN estado DROP DEFAULT;

ALTER TABLE public.acciones_diarias
  ALTER COLUMN estado TYPE public.action_status_new
  USING (
    CASE estado::text
      WHEN 'Pendiente' THEN 'En_Pausa'::public.action_status_new
      WHEN 'Hoy' THEN 'En_Pausa'::public.action_status_new
      WHEN 'Bloqueado' THEN 'En_Pausa'::public.action_status_new
      WHEN 'En_Ejecucion' THEN 'En_Proceso'::public.action_status_new
      WHEN 'Retraso' THEN 'Retrasa'::public.action_status_new
      WHEN 'Hecho' THEN 'Completada'::public.action_status_new
      WHEN 'Verificado' THEN 'Completada'::public.action_status_new
      ELSE 'En_Pausa'::public.action_status_new
    END
  );

ALTER TABLE public.acciones_diarias
  ALTER COLUMN estado SET DEFAULT 'En_Pausa'::public.action_status_new;

DROP TYPE public.action_status CASCADE;
ALTER TYPE public.action_status_new RENAME TO action_status;

-- Catálogo statuses
UPDATE public.statuses SET activo = false WHERE estado_key IS NOT NULL OR nombre IN (
  'Pendiente', 'Hoy', 'En_Ejecucion', 'Bloqueado', 'Retraso', 'Hecho', 'Verificado'
);

UPDATE public.statuses
SET estado_key = NULL
WHERE estado_key IN (
  'Pendiente', 'Hoy', 'En_Ejecucion', 'Bloqueado', 'Retraso', 'Hecho', 'Verificado'
);

ALTER TABLE public.statuses DROP CONSTRAINT IF EXISTS chk_statuses_estado_key;

ALTER TABLE public.statuses
  ADD CONSTRAINT chk_statuses_estado_key
  CHECK (
    estado_key IS NULL OR estado_key IN (
      'En_Pausa',
      'En_Proceso',
      'Completada',
      'Retrasa'
    )
  );

INSERT INTO public.statuses (nombre, descripcion, color, orden, es_cierre, activo, estado_key)
SELECT v.nombre, v.descripcion, v.color, v.orden, v.es_cierre, true, v.estado_key
FROM (
  VALUES
    (
      'En pausa',
      'Acción creada o detenida; aún no en ejecución.',
      '#94a3b8',
      1,
      false,
      'En_Pausa'
    ),
    (
      'En proceso',
      'Acción en curso.',
      '#60a5fa',
      2,
      false,
      'En_Proceso'
    ),
    (
      'Completada',
      'Acción cerrada con validaciones cumplidas.',
      '#34d399',
      3,
      true,
      'Completada'
    ),
    (
      'Retrasa',
      'Acción que superó su fecha o hora límite sin completarse.',
      '#f97316',
      4,
      false,
      'Retrasa'
    )
) AS v(nombre, descripcion, color, orden, es_cierre, estado_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.statuses s WHERE s.estado_key = v.estado_key
);

-- Checkpoints: bloquear Completada si hay pendientes
CREATE OR REPLACE FUNCTION public.acciones_prevent_hecho_if_checkpoints_pending()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Completada'::action_status
     AND (OLD.estado IS DISTINCT FROM NEW.estado)
  THEN
    IF EXISTS (
      SELECT 1 FROM public.accion_checkpoints c
      WHERE c.accion_id = NEW.id
        AND c.activo = true
        AND c.completado = false
    ) THEN
      RAISE EXCEPTION 'No puedes marcar esta acción como Completada porque aún existen puntos de validación pendientes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Evidencia obligatoria antes de Completada
CREATE OR REPLACE FUNCTION public.acciones_prevent_hecho_if_evidencia_missing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_evidence boolean;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Completada'::action_status
     AND OLD.estado IS DISTINCT FROM NEW.estado
     AND public.accion_requires_evidencia_text(NEW.evidencia_esperada)
  THEN
    has_evidence := NEW.evidencia_cargada OR public.accion_has_evidencia(NEW.id);
    IF NOT has_evidence THEN
      RAISE EXCEPTION 'No se puede marcar como Completada sin evidencia cargada.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Permisos y auditoría de cierre
CREATE OR REPLACE FUNCTION public.acciones_diarias_guard_estado_permissions_and_audit()
RETURNS TRIGGER AS $$
DECLARE
  me uuid;
  can_admin boolean;
  is_server_role boolean;
BEGIN
  me := public.get_my_usuario_id();
  is_server_role := auth.role() = 'service_role';
  can_admin := is_server_role OR public.is_app_admin() OR public.is_business_admin();

  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'Completada'::action_status THEN
      IF NOT can_admin THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden marcar esta accion como Completada.';
        END IF;
      END IF;
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.estado IS DISTINCT FROM OLD.estado) THEN
    IF NOT can_admin THEN
      IF NEW.estado = 'Completada'::action_status THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden marcar esta accion como Completada.';
        END IF;
      END IF;
    END IF;

    IF NEW.estado = 'Completada'::action_status AND OLD.estado IS DISTINCT FROM 'Completada'::action_status THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.acciones_diarias_guard_estado_permissions_and_audit() IS
  'Completada: permisos por creador/responsable/admin; auditoria completed_*.';

CREATE TRIGGER acciones_diarias_block_hecho_checkpoints
  BEFORE UPDATE OF estado ON public.acciones_diarias
  FOR EACH ROW EXECUTE FUNCTION public.acciones_prevent_hecho_if_checkpoints_pending();

CREATE TRIGGER acciones_diarias_block_hecho_evidencia
  BEFORE UPDATE OF estado ON public.acciones_diarias
  FOR EACH ROW EXECUTE FUNCTION public.acciones_prevent_hecho_if_evidencia_missing();

CREATE TRIGGER acciones_diarias_guard_estado_permissions_and_audit
  BEFORE INSERT OR UPDATE OF estado ON public.acciones_diarias
  FOR EACH ROW EXECUTE FUNCTION public.acciones_diarias_guard_estado_permissions_and_audit();

-- RPC de cierre (mantiene nombre por compatibilidad con clientes)
CREATE OR REPLACE FUNCTION public.try_set_accion_hecho(
  p_accion_id uuid,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  action_row public.acciones_diarias%ROWTYPE;
  pending_count integer;
  requires_evidence boolean;
  has_evidence boolean;
BEGIN
  actor_id := COALESCE(p_usuario_id, public.get_my_usuario_id());

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado.'
      USING ERRCODE = '42501';
  END IF;

  IF p_usuario_id IS NOT NULL
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND p_usuario_id IS DISTINCT FROM public.get_my_usuario_id()
  THEN
    RAISE EXCEPTION 'No puedes cerrar acciones en nombre de otro usuario.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO action_row
  FROM public.acciones_diarias
  WHERE id = p_accion_id
  FOR UPDATE;

  IF action_row.id IS NULL THEN
    RAISE EXCEPTION 'Accion no encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  IF action_row.estado = 'Completada'::action_status THEN
    RETURN jsonb_build_object(
      'ok', true,
      'accion_id', p_accion_id,
      'estado', 'Completada',
      'closed_by', actor_id
    );
  END IF;

  IF NOT public.can_close_accion_as(p_accion_id, actor_id) THEN
    RAISE EXCEPTION 'No tienes permiso para marcar esta accion como Completada.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
  INTO pending_count
  FROM public.accion_checkpoints c
  WHERE c.accion_id = p_accion_id
    AND c.activo = true
    AND c.completado = false;

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'No puedes marcar esta accion como Completada porque aun existen puntos de validacion pendientes.'
      USING ERRCODE = '23514';
  END IF;

  requires_evidence := public.accion_requires_evidencia_text(action_row.evidencia_esperada);
  has_evidence := action_row.evidencia_cargada OR public.accion_has_evidencia(p_accion_id);

  IF requires_evidence AND NOT has_evidence THEN
    RAISE EXCEPTION 'No se puede marcar como Completada sin evidencia cargada.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.acciones_diarias
  SET
    estado = 'Completada'::action_status,
    evidencia_cargada = CASE WHEN has_evidence THEN true ELSE evidencia_cargada END,
    completed_at = COALESCE(completed_at, now()),
    completed_by = COALESCE(completed_by, actor_id),
    updated_by = actor_id
  WHERE id = p_accion_id
    AND estado IS DISTINCT FROM 'Completada'::action_status;

  RETURN jsonb_build_object(
    'ok', true,
    'accion_id', p_accion_id,
    'estado', 'Completada',
    'closed_by', actor_id
  );
END;
$$;

-- Checklist: auto-completar acción
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

  IF p_completado THEN
    UPDATE public.acciones_diarias a
    SET
      estado = 'Completada'::action_status,
      completed_at = COALESCE(a.completed_at, now()),
      completed_by = COALESCE(a.completed_by, me),
      updated_by = me
    WHERE a.id = v_accion_id
      AND a.estado IS DISTINCT FROM 'Completada'::action_status
      AND NOT EXISTS (
        SELECT 1
        FROM public.accion_checkpoints pending
        WHERE pending.accion_id = a.id
          AND pending.activo = true
          AND pending.completado = false
      );
  END IF;
END;
$$;

-- Calendario: excluir acciones completadas
CREATE OR REPLACE FUNCTION public.calendar_action_counts_by_day(
  p_usuario_id uuid,
  p_from date,
  p_to date,
  p_area text DEFAULT NULL,
  p_responsable uuid DEFAULT NULL,
  p_estado text DEFAULT NULL
)
RETURNS TABLE(day date, action_count integer)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH visible_actions AS (
    SELECT
      a.id,
      GREATEST((a.created_at AT TIME ZONE 'America/Mexico_City')::date, p_from) AS visible_from
    FROM public.acciones_diarias a
    WHERE (a.created_at AT TIME ZONE 'America/Mexico_City')::date <= p_to
      AND a.estado::text <> 'Completada'
      AND (p_estado IS NULL OR a.estado::text = p_estado)
      AND (p_area IS NULL OR a.area = p_area)
      AND (p_responsable IS NULL OR a.responsable = p_responsable)
      AND (
        a.created_by = p_usuario_id
        OR a.responsable = p_usuario_id
        OR EXISTS (
          SELECT 1
          FROM public.accion_comentarios c
          WHERE c.accion_id = a.id
            AND (
              c.asignado = p_usuario_id
              OR c.etiquetas @> ARRAY[p_usuario_id::text]::text[]
            )
        )
      )
  ),
  expanded AS (
    SELECT gs.day::date
    FROM visible_actions va
    CROSS JOIN LATERAL generate_series(va.visible_from, p_to, interval '1 day') AS gs(day)
  )
  SELECT expanded.day, COUNT(*)::integer AS action_count
  FROM expanded
  GROUP BY expanded.day
  ORDER BY expanded.day;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
