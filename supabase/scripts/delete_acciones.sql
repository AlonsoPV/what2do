-- =============================================================================
-- Eliminar acciones (acciones_diarias) y datos relacionados
--
-- Ejecutar en Supabase → SQL Editor como postgres / service_role.
--
-- NOTA: accion_checkpoints tiene un trigger de permisos que bloquea DELETE en
-- cascada. Este script desactiva ese trigger durante el borrado y lo reactiva al
-- terminar (incluso si hay error).
--
-- Tablas que se eliminan en cascada al borrar acciones_diarias:
--   accion_evidencias, accion_historial, accion_dependencias,
--   accion_areas_asignadas, accion_flujo_cascada, accion_comentarios,
--   accion_checkpoints, accion_gaps, accion_catalog_kpis,
--   gap_actions_log, action_delivery_log, whatsapp_result_requests
--
-- NO se borran solos:
--   - Archivos en Storage (bucket evidencias) → ver sección 3
--   - notificaciones con payload.accion_id → se limpian en este script
--
-- IMPORTANTE:
--   1) Primera ejecución: deja v_dry_run := true (solo muestra conteos).
--   2) Revisa el resumen en NOTICE / Messages.
--   3) Cambia v_dry_run := false para borrar de verdad.
-- =============================================================================

DO $$
DECLARE
  -- true = solo contar; false = borrar
  v_dry_run boolean := true;

  -- ---------------------------------------------------------------------------
  -- Elige UNA estrategia (descomenta la que necesites)
  -- ---------------------------------------------------------------------------

  -- A) TODAS las acciones (default)
  v_filter_sql text := 'true';

  -- B) Solo acciones demo O2C
  -- v_filter_sql text := $f$ titulo_accion LIKE 'DEMO O2C ·%' $f$;

  -- C) Por creador (usuarios.id)
  -- v_filter_sql text := format('created_by = %L::uuid', '00000000-0000-0000-0000-000000000000');

  -- D) Por rango de creación
  -- v_filter_sql text := $f$
  --   created_at >= TIMESTAMPTZ '2026-05-01 00:00:00+00'
  --   AND created_at <  TIMESTAMPTZ '2026-06-01 00:00:00+00'
  -- $f$;

  -- E) Por sprint
  -- v_filter_sql text := format('sprint_id = %L::uuid', '00000000-0000-0000-0000-000000000000');

  -- F) Por responsable
  -- v_filter_sql text := format('responsable = %L::uuid', '00000000-0000-0000-0000-000000000000');

  v_count_acciones bigint;
  v_count_evidencias bigint;
  v_count_comentarios bigint;
  v_count_checkpoints bigint;
  v_count_whatsapp bigint;
  v_count_notificaciones bigint;
BEGIN
  EXECUTE format(
    'SELECT count(*) FROM public.acciones_diarias WHERE %s',
    v_filter_sql
  ) INTO v_count_acciones;

  EXECUTE format(
    'SELECT count(*) FROM public.accion_evidencias e
     WHERE e.accion_id IN (SELECT id FROM public.acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_evidencias;

  EXECUTE format(
    'SELECT count(*) FROM public.accion_comentarios c
     WHERE c.accion_id IN (SELECT id FROM public.acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_comentarios;

  EXECUTE format(
    'SELECT count(*) FROM public.accion_checkpoints cp
     WHERE cp.accion_id IN (SELECT id FROM public.acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_checkpoints;

  EXECUTE format(
    'SELECT count(*) FROM public.whatsapp_result_requests w
     WHERE w.accion_id IN (SELECT id FROM public.acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_whatsapp;

  EXECUTE format(
    $q$
      SELECT count(*) FROM public.notificaciones n
      WHERE n.payload ? 'accion_id'
        AND (n.payload->>'accion_id')::uuid IN (
          SELECT id FROM public.acciones_diarias WHERE %s
        )
    $q$,
    v_filter_sql
  ) INTO v_count_notificaciones;

  RAISE NOTICE '=== Borrado de acciones ===';
  RAISE NOTICE 'Filtro SQL: %', v_filter_sql;
  RAISE NOTICE 'Acciones: %', v_count_acciones;
  RAISE NOTICE 'Evidencias (cascade): %', v_count_evidencias;
  RAISE NOTICE 'Comentarios (cascade): %', v_count_comentarios;
  RAISE NOTICE 'Checkpoints (cascade): %', v_count_checkpoints;
  RAISE NOTICE 'WhatsApp requests (cascade): %', v_count_whatsapp;
  RAISE NOTICE 'Notificaciones vinculadas: %', v_count_notificaciones;

  IF v_count_acciones = 0 THEN
    RAISE NOTICE 'Nada que borrar con el filtro actual.';
    RETURN;
  END IF;

  IF v_dry_run THEN
    RAISE NOTICE 'DRY RUN: no se borró nada. Cambia v_dry_run := false para confirmar.';
    RETURN;
  END IF;

  -- El trigger de checklist impide DELETE en cascada desde SQL Editor.
  ALTER TABLE public.accion_checkpoints
    DISABLE TRIGGER accion_checkpoints_guard_assignee_permissions_trigger;

  BEGIN
    EXECUTE format(
      $q$
        DELETE FROM public.notificaciones n
        WHERE n.payload ? 'accion_id'
          AND (n.payload->>'accion_id')::uuid IN (
            SELECT id FROM public.acciones_diarias WHERE %s
          )
      $q$,
      v_filter_sql
    );

    EXECUTE format(
      'DELETE FROM public.acciones_diarias WHERE %s',
      v_filter_sql
    );

    ALTER TABLE public.accion_checkpoints
      ENABLE TRIGGER accion_checkpoints_guard_assignee_permissions_trigger;

    RAISE NOTICE 'Listo: % acciones eliminadas.', v_count_acciones;
  EXCEPTION
    WHEN OTHERS THEN
      ALTER TABLE public.accion_checkpoints
        ENABLE TRIGGER accion_checkpoints_guard_assignee_permissions_trigger;
      RAISE;
  END;
END $$;

-- =============================================================================
-- Vista previa (opcional)
-- =============================================================================

-- SELECT id, titulo_accion, estado, responsable, created_by, fecha, created_at
-- FROM public.acciones_diarias
-- ORDER BY created_at DESC
-- LIMIT 50;

-- =============================================================================
-- Storage: archivos de evidencia (opcional)
-- =============================================================================

-- SELECT DISTINCT storage_path FROM public.accion_evidencias ORDER BY 1;

-- =============================================================================
-- Atajo directo: borrar TODAS las acciones (destructivo)
-- =============================================================================

-- BEGIN;
-- ALTER TABLE public.accion_checkpoints
--   DISABLE TRIGGER accion_checkpoints_guard_assignee_permissions_trigger;
-- DELETE FROM public.notificaciones WHERE payload ? 'accion_id';
-- DELETE FROM public.acciones_diarias;
-- ALTER TABLE public.accion_checkpoints
--   ENABLE TRIGGER accion_checkpoints_guard_assignee_permissions_trigger;
-- COMMIT;

-- SELECT count(*) FROM public.acciones_diarias;
