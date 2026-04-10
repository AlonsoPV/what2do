-- =============================================================================
-- Acciones: múltiples gaps y KPIs de catálogo (tablas puente).
-- Mantiene gap_id / catalog_kpi_id en acciones_diarias como "primario" (primer id)
-- para compatibilidad con código existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas puente
-- -----------------------------------------------------------------------------

CREATE TABLE accion_gaps (
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  gap_id uuid NOT NULL REFERENCES gaps(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (accion_id, gap_id)
);

CREATE INDEX idx_accion_gaps_gap_id ON accion_gaps(gap_id);

COMMENT ON TABLE accion_gaps IS 'Brechas O2C impactadas por la acción (N:N)';

CREATE TABLE accion_catalog_kpis (
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  catalog_kpi_id uuid NOT NULL REFERENCES catalog_kpis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (accion_id, catalog_kpi_id)
);

CREATE INDEX idx_accion_catalog_kpis_kpi ON accion_catalog_kpis(catalog_kpi_id);

COMMENT ON TABLE accion_catalog_kpis IS 'KPIs de catálogo impactados por la acción (N:N)';

-- -----------------------------------------------------------------------------
-- Backfill desde columnas legacy
-- -----------------------------------------------------------------------------

INSERT INTO accion_gaps (accion_id, gap_id)
SELECT id, gap_id
FROM acciones_diarias
WHERE gap_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO accion_catalog_kpis (accion_id, catalog_kpi_id)
SELECT id, catalog_kpi_id
FROM acciones_diarias
WHERE catalog_kpi_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Trigger: gap_actions_log debe aceptar cualquier gap vinculado a la acción
-- (columna primaria o fila en accion_gaps).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gap_actions_log_match_accion_gap()
RETURNS TRIGGER AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM acciones_diarias a
    WHERE a.id = NEW.accion_id
      AND (
        a.gap_id IS NOT DISTINCT FROM NEW.gap_id
        OR EXISTS (
          SELECT 1 FROM accion_gaps ag
          WHERE ag.accion_id = a.id AND ag.gap_id = NEW.gap_id
        )
      )
  )
  INTO ok;

  IF NOT ok THEN
    RAISE EXCEPTION
      'gap_id del log debe estar vinculado a la acción (acciones_diarias.gap_id o accion_gaps)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- RLS (alineado a acciones: lectura amplia; escritura si responsable/creador/admin)
-- -----------------------------------------------------------------------------

ALTER TABLE accion_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE accion_catalog_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY accion_gaps_select_authenticated ON accion_gaps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_gaps_insert_responsable_creator_admin ON accion_gaps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_gaps.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );

CREATE POLICY accion_gaps_delete_responsable_creator_admin ON accion_gaps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_gaps.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );

CREATE POLICY accion_catalog_kpis_select_authenticated ON accion_catalog_kpis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_catalog_kpis_insert_responsable_creator_admin ON accion_catalog_kpis
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_catalog_kpis.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );

CREATE POLICY accion_catalog_kpis_delete_responsable_creator_admin ON accion_catalog_kpis
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_catalog_kpis.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );
