-- =============================================================================
-- Eliminar acciones del tablero (acciones_diarias) y datos relacionados
--
-- Las tablas hijas tienen ON DELETE CASCADE respecto a acciones_diarias:
--   accion_evidencias, accion_historial, accion_dependencias,
--   accion_areas_asignadas, accion_flujo_cascada, accion_comentarios,
--   accion_checkpoints, gap_actions_log, accion_gaps, accion_catalog_kpis
--
-- NO se borran automáticamente:
--   - Archivos en Storage (bucket evidencias) → revisar sección al final
--   - Notificaciones con payload.accion_id → opcional (incluido abajo)
--   - Sprints (solo se desvincula sprint_id en acciones)
--
-- Ejecutar en Supabase SQL Editor como postgres / service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Configura el alcance (elige UNA estrategia descomentando el bloque activo)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  -- Cambia a false para ejecutar el borrado real
  v_dry_run boolean := true;

  -- Estrategia A (default): solo acciones demo O2C
  v_filter_sql text := $f$
    titulo_accion LIKE 'DEMO O2C ·%'
  $f$;

  -- Estrategia B: TODAS las acciones (descomenta y comenta la A)
  -- v_filter_sql text := 'true';

  -- Estrategia C: por creador (usuarios.id)
  -- v_filter_sql text := format('created_by = %L::uuid', '00000000-0000-0000-0000-000000000000');

  -- Estrategia D: por rango de fechas
  -- v_filter_sql text := $f$
  --   created_at >= TIMESTAMPTZ '2026-05-01 00:00:00+00'
  --   AND created_at <  TIMESTAMPTZ '2026-06-01 00:00:00+00'
  -- $f$;

  -- Estrategia E: por sprint
  -- v_filter_sql text := format('sprint_id = %L::uuid', '00000000-0000-0000-0000-000000000000');

  v_count_acciones bigint;
  v_count_evidencias bigint;
  v_count_comentarios bigint;
  v_count_checkpoints bigint;
  v_count_gap_log bigint;
  v_count_notificaciones bigint;
BEGIN
  EXECUTE format(
    'SELECT count(*) FROM acciones_diarias WHERE %s',
    v_filter_sql
  ) INTO v_count_acciones;

  EXECUTE format(
    'SELECT count(*) FROM accion_evidencias e
     WHERE e.accion_id IN (SELECT id FROM acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_evidencias;

  EXECUTE format(
    'SELECT count(*) FROM accion_comentarios c
     WHERE c.accion_id IN (SELECT id FROM acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_comentarios;

  EXECUTE format(
    'SELECT count(*) FROM accion_checkpoints cp
     WHERE cp.accion_id IN (SELECT id FROM acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_checkpoints;

  EXECUTE format(
    'SELECT count(*) FROM gap_actions_log g
     WHERE g.accion_id IN (SELECT id FROM acciones_diarias WHERE %s)',
    v_filter_sql
  ) INTO v_count_gap_log;

  EXECUTE format(
    $q$
      SELECT count(*) FROM notificaciones n
      WHERE n.payload ? 'accion_id'
        AND (n.payload->>'accion_id')::uuid IN (
          SELECT id FROM acciones_diarias WHERE %s
        )
    $q$,
    v_filter_sql
  ) INTO v_count_notificaciones;

  RAISE NOTICE '--- Resumen del borrado ---';
  RAISE NOTICE 'Filtro: %', v_filter_sql;
  RAISE NOTICE 'Acciones a eliminar: %', v_count_acciones;
  RAISE NOTICE 'Evidencias (cascade): %', v_count_evidencias;
  RAISE NOTICE 'Comentarios (cascade): %', v_count_comentarios;
  RAISE NOTICE 'Checkpoints (cascade): %', v_count_checkpoints;
  RAISE NOTICE 'Gap actions log (cascade): %', v_count_gap_log;
  RAISE NOTICE 'Notificaciones vinculadas (opcional): %', v_count_notificaciones;

  IF v_count_acciones = 0 THEN
    RAISE NOTICE 'Nada que borrar con el filtro actual.';
    RETURN;
  END IF;

  IF v_dry_run THEN
    RAISE NOTICE 'DRY RUN: no se borró nada. Cambia v_dry_run := false para confirmar.';
    RETURN;
  END IF;

  -- Notificaciones huérfanas (opcional pero recomendado)
  EXECUTE format(
    $q$
      DELETE FROM notificaciones n
      WHERE n.payload ? 'accion_id'
        AND (n.payload->>'accion_id')::uuid IN (
          SELECT id FROM acciones_diarias WHERE %s
        )
    $q$,
    v_filter_sql
  );

  -- Borrado principal (el resto cae por CASCADE)
  EXECUTE format(
    'DELETE FROM acciones_diarias WHERE %s',
    v_filter_sql
  );

  RAISE NOTICE 'Borrado completado: % acciones eliminadas.', v_count_acciones;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Vista previa manual (opcional): listar acciones que coinciden
-- -----------------------------------------------------------------------------

-- SELECT id, titulo_accion, estado, responsable, created_by, sprint_id, created_at
-- FROM acciones_diarias
-- WHERE titulo_accion LIKE 'DEMO O2C ·%'
-- ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 3) Storage: archivos de evidencia NO se eliminan solos
--    Ejecuta ANTES del borrado si quieres limpiar el bucket.
-- -----------------------------------------------------------------------------

-- SELECT DISTINCT storage_path
-- FROM accion_evidencias e
-- WHERE e.accion_id IN (
--   SELECT id FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%'
-- )
-- ORDER BY 1;

-- En Supabase Dashboard → Storage → bucket de evidencias, borra esas rutas
-- o usa la API/admin con service_role.

-- -----------------------------------------------------------------------------
-- 4) Atajo: borrar SOLO demo O2C (sin bloque DO)
-- -----------------------------------------------------------------------------

-- BEGIN;
-- DELETE FROM notificaciones n
-- WHERE n.payload ? 'accion_id'
--   AND (n.payload->>'accion_id')::uuid IN (
--     SELECT id FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%'
--   );
-- DELETE FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%';
-- COMMIT;

-- -----------------------------------------------------------------------------
-- 5) Atajo: borrar TODAS las acciones (destructivo)
-- -----------------------------------------------------------------------------

-- BEGIN;
-- DELETE FROM notificaciones WHERE payload ? 'accion_id';
-- DELETE FROM acciones_diarias;
-- COMMIT;
