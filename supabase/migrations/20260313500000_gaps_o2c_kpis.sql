-- =============================================================================
-- Gaps O2C + KPIs ponderados (catalog_kpis extendido, mediciones, snapshots, log)
-- No sustituye kpis/kpi_mediciones legacy; convive con catalog_kpis existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

CREATE TYPE gap_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE catalog_kpi_direction AS ENUM (
  'maximize',
  'minimize'
);

-- -----------------------------------------------------------------------------
-- gaps
-- -----------------------------------------------------------------------------

CREATE TABLE gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  prioridad text,
  status gap_status NOT NULL DEFAULT 'open',
  area text,
  owner_usuario uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  total_story_points numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_gaps_nombre_length CHECK (char_length(trim(nombre)) >= 2),
  CONSTRAINT chk_gaps_total_story_points_nonneg CHECK (total_story_points >= 0)
);

CREATE INDEX idx_gaps_status ON gaps(status);
CREATE INDEX idx_gaps_area ON gaps(area) WHERE area IS NOT NULL;
CREATE INDEX idx_gaps_activo ON gaps(activo);
CREATE INDEX idx_gaps_owner_usuario ON gaps(owner_usuario) WHERE owner_usuario IS NOT NULL;

CREATE TRIGGER set_gaps_updated_at
  BEFORE UPDATE ON gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gaps IS 'Brechas O2C; KPIs ponderados se enlazan vía catalog_kpis.gap_id';
COMMENT ON COLUMN gaps.total_story_points IS 'Cache opcional; puede alinearse con suma de story_points en acciones del gap';

-- -----------------------------------------------------------------------------
-- catalog_kpis: columnas métricas O2C
-- -----------------------------------------------------------------------------

ALTER TABLE catalog_kpis
  ADD COLUMN gap_id uuid REFERENCES gaps(id) ON DELETE SET NULL,
  ADD COLUMN weight numeric,
  ADD COLUMN baseline numeric,
  ADD COLUMN target_m18 numeric,
  ADD COLUMN direction catalog_kpi_direction,
  ADD COLUMN current_value numeric,
  ADD COLUMN in_global_portfolio boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN catalog_kpis.gap_id IS 'Gap O2C; NULL = KPI de catálogo sin brecha';
COMMENT ON COLUMN catalog_kpis.weight IS 'Peso 0–1 dentro del gap; suma por gap (activos) = 1';
COMMENT ON COLUMN catalog_kpis.baseline IS 'Línea base para cumplimiento O2C';
COMMENT ON COLUMN catalog_kpis.target_m18 IS 'Meta explícita (p.ej. M18); independiente de meta_objetivo legacy';
COMMENT ON COLUMN catalog_kpis.direction IS 'maximize | minimize';
COMMENT ON COLUMN catalog_kpis.current_value IS 'Último valor cache (opcional); preferir catalog_kpi_measurements';
COMMENT ON COLUMN catalog_kpis.in_global_portfolio IS 'Si true y activo con gap_id, cuenta en suma de pesos global';

ALTER TABLE catalog_kpis
  ADD CONSTRAINT chk_catalog_kpis_weight_range CHECK (
    weight IS NULL OR (weight >= 0::numeric AND weight <= 1::numeric)
  );

ALTER TABLE catalog_kpis
  ADD CONSTRAINT chk_catalog_kpis_weight_when_gap_active CHECK (
    gap_id IS NULL
    OR activo = false
    OR weight IS NOT NULL
  );

CREATE INDEX idx_catalog_kpis_gap_id ON catalog_kpis(gap_id) WHERE gap_id IS NOT NULL;
CREATE INDEX idx_catalog_kpis_global_portfolio
  ON catalog_kpis(in_global_portfolio)
  WHERE in_global_portfolio = true AND gap_id IS NOT NULL AND activo = true;

-- -----------------------------------------------------------------------------
-- Validación de pesos (diferida: permite ajustes multi-fila en una transacción)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION catalog_kpis_validate_weight_sums()
RETURNS TRIGGER AS $$
DECLARE
  tol constant numeric := 0.0001;
  r record;
  global_sum numeric;
BEGIN
  -- Por gap: si hay al menos un KPI activo con gap_id, la suma de weight debe ser ~1
  FOR r IN
    SELECT ck.gap_id AS gid, COALESCE(SUM(ck.weight), 0::numeric) AS wsum
    FROM catalog_kpis ck
    WHERE ck.activo = true AND ck.gap_id IS NOT NULL
    GROUP BY ck.gap_id
  LOOP
    IF ABS(r.wsum - 1::numeric) > tol THEN
      RAISE EXCEPTION
        'Suma de pesos por gap debe ser 1.0 (gap_id=%). Actual: %',
        r.gid,
        r.wsum;
    END IF;
  END LOOP;

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

CREATE CONSTRAINT TRIGGER trg_catalog_kpis_validate_weight_sums
  AFTER INSERT OR DELETE OR UPDATE OF gap_id, weight, activo, in_global_portfolio
  ON catalog_kpis
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION catalog_kpis_validate_weight_sums();

-- -----------------------------------------------------------------------------
-- catalog_kpi_measurements (histórico; distinto de kpi_mediciones legacy)
-- -----------------------------------------------------------------------------

CREATE TABLE catalog_kpi_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_kpi_id uuid NOT NULL REFERENCES catalog_kpis(id) ON DELETE CASCADE,
  medido_en timestamptz NOT NULL DEFAULT now(),
  valor numeric NOT NULL,
  fuente text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_kpi_measurements_kpi_medido
  ON catalog_kpi_measurements(catalog_kpi_id, medido_en DESC);

COMMENT ON TABLE catalog_kpi_measurements IS 'Series temporales para KPIs de catálogo O2C (no confundir con kpi_mediciones)';

-- -----------------------------------------------------------------------------
-- global_score_snapshots
-- -----------------------------------------------------------------------------

CREATE TABLE global_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score numeric NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_global_score_snapshots_score_range CHECK (score >= 0::numeric AND score <= 1::numeric)
);

CREATE INDEX idx_global_score_snapshots_created_at ON global_score_snapshots(created_at DESC);

COMMENT ON TABLE global_score_snapshots IS 'Snapshots del score global O2C (0–1); metadata opcional (on_track / at_risk / off_track)';

-- -----------------------------------------------------------------------------
-- gap_actions_log (eventos; no actualiza KPI aquí)
-- -----------------------------------------------------------------------------

CREATE TABLE gap_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id uuid NOT NULL REFERENCES gaps(id) ON DELETE CASCADE,
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT chk_gap_actions_log_event_type CHECK (char_length(trim(event_type)) >= 1)
);

CREATE INDEX idx_gap_actions_log_gap_id ON gap_actions_log(gap_id);
CREATE INDEX idx_gap_actions_log_accion_id ON gap_actions_log(accion_id);
CREATE INDEX idx_gap_actions_log_created_at ON gap_actions_log(created_at DESC);

COMMENT ON TABLE gap_actions_log IS 'Eventos acción↔gap (p.ej. cierre); no escribe mediciones ni current_value';

-- -----------------------------------------------------------------------------
-- acciones_diarias: vínculos opcionales gap / KPI catálogo (kpi_afectado legacy se mantiene)
-- -----------------------------------------------------------------------------

ALTER TABLE acciones_diarias
  ADD COLUMN gap_id uuid REFERENCES gaps(id) ON DELETE SET NULL,
  ADD COLUMN story_points numeric NOT NULL DEFAULT 0,
  ADD COLUMN catalog_kpi_id uuid REFERENCES catalog_kpis(id) ON DELETE SET NULL;

ALTER TABLE acciones_diarias
  ADD CONSTRAINT chk_acciones_story_points_nonneg CHECK (story_points >= 0::numeric);

CREATE INDEX idx_acciones_diarias_gap_id ON acciones_diarias(gap_id) WHERE gap_id IS NOT NULL;
CREATE INDEX idx_acciones_diarias_catalog_kpi_id ON acciones_diarias(catalog_kpi_id) WHERE catalog_kpi_id IS NOT NULL;

COMMENT ON COLUMN acciones_diarias.gap_id IS 'Brecha O2C opcional; convive con kpi_afectado legacy';
COMMENT ON COLUMN acciones_diarias.story_points IS 'Puntos de historia para progreso del gap';
COMMENT ON COLUMN acciones_diarias.catalog_kpi_id IS 'KPI de catálogo O2C opcional';

-- -----------------------------------------------------------------------------
-- Coherencia gap_id en log vs acción
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gap_actions_log_match_accion_gap()
RETURNS TRIGGER AS $$
DECLARE
  ag uuid;
BEGIN
  SELECT a.gap_id INTO ag FROM acciones_diarias a WHERE a.id = NEW.accion_id;
  IF ag IS DISTINCT FROM NEW.gap_id THEN
    RAISE EXCEPTION 'gap_id del log debe coincidir con acciones_diarias.gap_id para la acción';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gap_actions_log_match_accion_gap
  BEFORE INSERT OR UPDATE OF gap_id, accion_id ON gap_actions_log
  FOR EACH ROW
  EXECUTE FUNCTION gap_actions_log_match_accion_gap();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY gaps_select_authenticated ON gaps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY gaps_insert_admin ON gaps
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY gaps_update_admin ON gaps
  FOR UPDATE USING (is_app_admin());

CREATE POLICY gaps_delete_admin ON gaps
  FOR DELETE USING (is_app_admin());

-- catalog_kpis: habilitar RLS alineado a catálogos administrados
ALTER TABLE catalog_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_kpis_select_authenticated ON catalog_kpis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY catalog_kpis_insert_admin ON catalog_kpis
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY catalog_kpis_update_admin ON catalog_kpis
  FOR UPDATE USING (is_app_admin());

CREATE POLICY catalog_kpis_delete_admin ON catalog_kpis
  FOR DELETE USING (is_app_admin());

ALTER TABLE catalog_kpi_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_kpi_measurements_select_authenticated ON catalog_kpi_measurements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY catalog_kpi_measurements_insert_admin ON catalog_kpi_measurements
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY catalog_kpi_measurements_update_admin ON catalog_kpi_measurements
  FOR UPDATE USING (is_app_admin());

CREATE POLICY catalog_kpi_measurements_delete_admin ON catalog_kpi_measurements
  FOR DELETE USING (is_app_admin());

ALTER TABLE global_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY global_score_snapshots_select_authenticated ON global_score_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY global_score_snapshots_insert_admin ON global_score_snapshots
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY global_score_snapshots_update_admin ON global_score_snapshots
  FOR UPDATE USING (is_app_admin());

CREATE POLICY global_score_snapshots_delete_admin ON global_score_snapshots
  FOR DELETE USING (is_app_admin());

ALTER TABLE gap_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY gap_actions_log_select_authenticated ON gap_actions_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert: quien puede actualizar la acción vinculada (cierre / eventos)
CREATE POLICY gap_actions_log_insert_responsable_or_admin ON gap_actions_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

CREATE POLICY gap_actions_log_update_admin ON gap_actions_log
  FOR UPDATE USING (is_app_admin());

CREATE POLICY gap_actions_log_delete_admin ON gap_actions_log
  FOR DELETE USING (is_app_admin());
