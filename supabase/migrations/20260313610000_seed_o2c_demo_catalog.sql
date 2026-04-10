-- =============================================================================
-- Seed opcional: gap + 4 KPIs demo (pesos 0.25 c/u → suma global 1.0).
-- Solo se inserta si catalog_kpis está vacío (no pisar entornos con datos).
-- =============================================================================

DO $$
DECLARE
  gid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM catalog_kpis LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO gaps (nombre, descripcion, status, area, activo)
  VALUES (
    'Demo O2C — Brecha única',
    'Datos de ejemplo; ajustar o borrar en producción.',
    'open',
    'Operaciones',
    true
  )
  RETURNING id INTO gid;

  INSERT INTO catalog_kpis (
    nombre,
    unidad,
    tipo,
    periodicidad,
    orden,
    activo,
    gap_id,
    weight,
    baseline,
    target_m18,
    calc_type,
    direction,
    in_global_portfolio,
    threshold_green,
    threshold_yellow
  )
  VALUES
    (
      'Demo — OTIF',
      'porcentaje',
      'manual',
      'mensual',
      1,
      true,
      gid,
      0.25,
      80,
      95,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'Demo — DSO',
      'porcentaje',
      'manual',
      'mensual',
      2,
      true,
      gid,
      0.25,
      45,
      30,
      'minimize'::catalog_kpi_calc_type,
      'minimize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'Demo — Exactitud facturación',
      'porcentaje',
      'manual',
      'mensual',
      3,
      true,
      gid,
      0.25,
      90,
      99.5,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'Demo — Indicador binario',
      'porcentaje',
      'manual',
      'mensual',
      4,
      true,
      gid,
      0.25,
      0,
      1,
      'binary'::catalog_kpi_calc_type,
      NULL,
      true,
      0.85,
      0.65
    );
END $$;
