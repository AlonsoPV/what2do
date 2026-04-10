-- =============================================================================
-- Catálogo KPI O2C: calc_type, metas m6/m12, umbrales semáforo, responsable KPI,
-- notas y medidor en mediciones; validación de pesos solo portfolio global.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipo de cálculo de negocio (independiente de direction legacy)
-- -----------------------------------------------------------------------------

CREATE TYPE catalog_kpi_calc_type AS ENUM (
  'minimize',
  'maximize',
  'binary'
);

COMMENT ON TYPE catalog_kpi_calc_type IS 'Cómo interpretar baseline/meta/valor para cumplimiento O2C';

-- -----------------------------------------------------------------------------
-- catalog_kpis: nuevas columnas
-- -----------------------------------------------------------------------------

ALTER TABLE catalog_kpis
  ADD COLUMN calc_type catalog_kpi_calc_type,
  ADD COLUMN target_m6 numeric,
  ADD COLUMN target_m12 numeric,
  ADD COLUMN threshold_green numeric,
  ADD COLUMN threshold_yellow numeric,
  ADD COLUMN owner_usuario uuid REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN catalog_kpis.calc_type IS 'minimize | maximize | binary; preferido sobre direction para nuevas filas';
COMMENT ON COLUMN catalog_kpis.target_m6 IS 'Meta horizonte M6 (nullable)';
COMMENT ON COLUMN catalog_kpis.target_m12 IS 'Meta horizonte M12 (nullable)';
COMMENT ON COLUMN catalog_kpis.threshold_green IS 'Umbral mínimo de cumplimiento (0–1) para verde; green >= yellow';
COMMENT ON COLUMN catalog_kpis.threshold_yellow IS 'Umbral mínimo de cumplimiento (0–1) para amarillo';
COMMENT ON COLUMN catalog_kpis.owner_usuario IS 'Responsable del KPI (catálogo O2C)';

COMMENT ON COLUMN catalog_kpis.weight IS 'Peso 0–1; la suma global de activos con gap y en portfolio debe ser ~1 (no se valida por gap)';

ALTER TABLE catalog_kpis
  ADD CONSTRAINT chk_catalog_kpis_thresholds_semaforo CHECK (
    (threshold_green IS NULL OR (threshold_green >= 0::numeric AND threshold_green <= 1::numeric))
    AND (threshold_yellow IS NULL OR (threshold_yellow >= 0::numeric AND threshold_yellow <= 1::numeric))
    AND (
      threshold_green IS NULL
      OR threshold_yellow IS NULL
      OR threshold_green >= threshold_yellow
    )
  );

CREATE INDEX idx_catalog_kpis_owner_usuario
  ON catalog_kpis(owner_usuario)
  WHERE owner_usuario IS NOT NULL;

-- Backfill calc_type desde direction (maximize/minimize); binary queda NULL hasta asignación manual
UPDATE catalog_kpis
SET calc_type = CASE direction
  WHEN 'maximize'::catalog_kpi_direction THEN 'maximize'::catalog_kpi_calc_type
  WHEN 'minimize'::catalog_kpi_direction THEN 'minimize'::catalog_kpi_calc_type
END
WHERE direction IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Validación de pesos: solo suma global del portfolio (sin validar por gap)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION catalog_kpis_validate_weight_sums()
RETURNS TRIGGER AS $$
DECLARE
  tol constant numeric := 0.0001;
  global_sum numeric;
BEGIN
  -- Global: KPIs activos con gap y en portfolio global deben sumar ~1 si existe al menos uno
  IF EXISTS (
    SELECT 1 FROM catalog_kpis
    WHERE activo = true
      AND gap_id IS NOT NULL
      AND in_global_portfolio = true
  ) THEN
    SELECT COALESCE(SUM(weight), 0::numeric)
    INTO global_sum
    FROM catalog_kpis
    WHERE activo = true
      AND gap_id IS NOT NULL
      AND in_global_portfolio = true;

    IF ABS(global_sum - 1::numeric) > tol THEN
      RAISE EXCEPTION
        'Suma de pesos del portfolio global (activos, con gap, in_global_portfolio) debe ser 1.0. Actual: %',
        global_sum;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- catalog_kpi_measurements: notes, measured_by
-- -----------------------------------------------------------------------------

ALTER TABLE catalog_kpi_measurements
  ADD COLUMN notes text,
  ADD COLUMN measured_by uuid REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN catalog_kpi_measurements.notes IS 'Notas de la medición';
COMMENT ON COLUMN catalog_kpi_measurements.measured_by IS 'Usuario que registró la medición';

CREATE INDEX idx_catalog_kpi_measurements_measured_by
  ON catalog_kpi_measurements(measured_by)
  WHERE measured_by IS NOT NULL;

-- RLS: mismas políticas por fila; nuevas columnas heredan INSERT/UPDATE admin.
-- Sin cambios adicionales: mediciones siguen siendo administración centralizada.
