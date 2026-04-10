-- =============================================================================
-- Demo: mezcla de estados de semáforo en KPIs O2C del portafolio global
-- (En meta / En riesgo / Fuera / Sin datos) para score global y grillas.
--
-- Criterio (horizonte M18, umbrales por defecto 0.85 / 0.65 en cumplimiento 0–1):
-- - maximize: cumplimiento ≈ (current - baseline) / (target_m18 - baseline)
-- - minimize: cumplimiento ≈ (baseline - current) / (baseline - target_m18)
--
-- Requiere filas del seed O2C — 10 KPIs (nombres exactos). Idempotente por UPDATE.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_kpis WHERE nombre = 'O2C — OTIF' LIMIT 1) THEN
    RAISE NOTICE 'seed_catalog_kpi_semaforo_demo_mix: catálogo O2C no encontrado; se omite.';
    RETURN;
  END IF;

  -- En meta (cumplimiento alto / ≥ umbral verde)
  UPDATE catalog_kpis SET current_value = 94.0 WHERE nombre = 'O2C — OTIF';
  UPDATE catalog_kpis SET current_value = 97.0 WHERE nombre = 'O2C — Evidencias T+0';
  UPDATE catalog_kpis SET current_value = 17.6 WHERE nombre = 'O2C — Margen bruto';

  -- En riesgo (entre ~0.65 y ~0.85)
  UPDATE catalog_kpis SET current_value = 88.64 WHERE nombre = 'O2C — OTD (cumplimiento fecha promesa)';
  UPDATE catalog_kpis SET current_value = 98.75 WHERE nombre = 'O2C — Exactitud de facturación';
  UPDATE catalog_kpis SET current_value = 7.5 WHERE nombre = 'O2C — Rotación de cartera';

  -- Fuera de meta (< ~0.65)
  UPDATE catalog_kpis SET current_value = 16.5 WHERE nombre = 'O2C — Incidencias de calidad';
  UPDATE catalog_kpis SET current_value = 44.0 WHERE nombre = 'O2C — DSO';
  UPDATE catalog_kpis SET current_value = 84.0 WHERE nombre = 'O2C — Perfect order rate';

  -- Sin datos: sin línea base no hay cumplimiento (la app no asume valor por defecto útil)
  UPDATE catalog_kpis
  SET baseline = NULL, current_value = NULL
  WHERE nombre = 'O2C — NPS';

  RAISE NOTICE 'seed_catalog_kpi_semaforo_demo_mix: valores demo aplicados (3+3+3+1 en semáforo).';
END;
$$;
