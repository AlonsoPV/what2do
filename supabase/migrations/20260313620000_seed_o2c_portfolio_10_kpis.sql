-- =============================================================================
-- Seed O2C: 10 KPIs de catálogo + 5 gaps (pesos globales ∑ = 1.0).
-- Fuente de criterios: KPIs "sagrados" y métricas O2C habituales
-- (docs/dashboard-spec.md §10.1) + complementos de ciclo pedido–cobro.
--
-- Idempotencia:
-- - Si ya existe un KPI con nombre 'O2C — OTIF', no hace nada.
-- - Si el catálogo está vacío, inserta gaps + KPIs.
-- - Si solo está el demo de 20260313610000 (gap "Demo O2C — Brecha única" y sus 4 KPIs),
--   elimina ese demo e inserta este portafolio.
-- En cualquier otro caso (datos personalizados mezclados), no inserta para no romper
-- la validación de suma de pesos del portfolio global.
-- =============================================================================

DO $$
DECLARE
  total_ck integer;
  demo_ck integer;
  gid_pedido uuid;
  gid_cumplimiento uuid;
  gid_facturacion uuid;
  gid_cobranza uuid;
  gid_rentabilidad uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM catalog_kpis WHERE nombre = 'O2C — OTIF') THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer INTO total_ck FROM catalog_kpis;

  SELECT COUNT(*)::integer INTO demo_ck
  FROM catalog_kpis ck
  INNER JOIN gaps g ON g.id = ck.gap_id
  WHERE g.nombre = 'Demo O2C — Brecha única';

  IF total_ck > 0 AND (demo_ck IS DISTINCT FROM total_ck OR demo_ck = 0) THEN
    RETURN;
  END IF;

  IF demo_ck > 0 THEN
    DELETE FROM catalog_kpis
    WHERE gap_id IN (SELECT id FROM gaps WHERE nombre = 'Demo O2C — Brecha única');
    DELETE FROM gaps WHERE nombre = 'Demo O2C — Brecha única';
  END IF;

  INSERT INTO gaps (nombre, descripcion, status, area, activo)
  VALUES
    (
      'O2C — Pedido y oferta',
      'Desde la captura del pedido hasta la confirmación de disponibilidad y condiciones comerciales.',
      'open',
      'Comercial',
      true
    ),
    (
      'O2C — Cumplimiento y entrega',
      'Planificación, despacho y entrega; calidad de servicio en campo.',
      'open',
      'Operaciones',
      true
    ),
    (
      'O2C — Facturación y registro',
      'Emisión correcta y oportuna de documentos y registro contable.',
      'open',
      'Finanzas',
      true
    ),
    (
      'O2C — Cobranza y capital de trabajo',
      'Recuperación de efectivo y gestión de cuentas por cobrar.',
      'open',
      'Finanzas',
      true
    ),
    (
      'O2C — Rentabilidad y experiencia de cliente',
      'Margen y percepción del cliente sobre el ciclo completo.',
      'open',
      'Dirección',
      true
    );

  SELECT id INTO gid_pedido FROM gaps WHERE nombre = 'O2C — Pedido y oferta';
  SELECT id INTO gid_cumplimiento FROM gaps WHERE nombre = 'O2C — Cumplimiento y entrega';
  SELECT id INTO gid_facturacion FROM gaps WHERE nombre = 'O2C — Facturación y registro';
  SELECT id INTO gid_cobranza FROM gaps WHERE nombre = 'O2C — Cobranza y capital de trabajo';
  SELECT id INTO gid_rentabilidad FROM gaps WHERE nombre = 'O2C — Rentabilidad y experiencia de cliente';

  INSERT INTO catalog_kpis (
    nombre,
    descripcion,
    unidad,
    tipo,
    periodicidad,
    orden,
    activo,
    gap_id,
    weight,
    baseline,
    target_m6,
    target_m12,
    target_m18,
    calc_type,
    direction,
    in_global_portfolio,
    threshold_green,
    threshold_yellow
  )
  VALUES
    (
      'O2C — OTIF',
      'On time in full: entregas a tiempo y completas respecto al pedido.',
      'porcentaje',
      'manual',
      'mensual',
      1,
      true,
      gid_cumplimiento,
      0.15,
      85,
      90,
      92,
      95,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — OTD (cumplimiento fecha promesa)',
      'Porcentaje de pedidos entregados en la fecha prometida al cliente.',
      'porcentaje',
      'manual',
      'mensual',
      2,
      true,
      gid_cumplimiento,
      0.10,
      80,
      85,
      88,
      92,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Incidencias de calidad',
      'Incidencias de calidad registradas en el período (menor es mejor).',
      'numero',
      'manual',
      'mensual',
      3,
      true,
      gid_cumplimiento,
      0.08,
      25,
      15,
      10,
      8,
      'minimize'::catalog_kpi_calc_type,
      'minimize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Evidencias T+0',
      'Evidencia de entrega cargada el mismo día de la acción operativa.',
      'porcentaje',
      'manual',
      'mensual',
      4,
      true,
      gid_facturacion,
      0.10,
      88,
      92,
      95,
      98,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Exactitud de facturación',
      'Facturas sin error respecto a pedido, precios y cantidades.',
      'porcentaje',
      'manual',
      'mensual',
      5,
      true,
      gid_facturacion,
      0.10,
      97,
      98,
      99,
      99.5,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — DSO',
      'Días de ventas pendientes de cobro (Days Sales Outstanding).',
      'dias',
      'manual',
      'mensual',
      6,
      true,
      gid_cobranza,
      0.12,
      52,
      45,
      40,
      35,
      'minimize'::catalog_kpi_calc_type,
      'minimize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Rotación de cartera',
      'Veces que se cobra el saldo de cuentas por cobrar en el año (mayor es mejor).',
      'veces',
      'manual',
      'mensual',
      7,
      true,
      gid_cobranza,
      0.05,
      6,
      7,
      7.5,
      8,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Margen bruto',
      'Margen bruto sobre ventas (política de precios y costos).',
      'porcentaje',
      'manual',
      'mensual',
      8,
      true,
      gid_rentabilidad,
      0.12,
      14,
      15,
      16.5,
      18,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — NPS',
      'Net Promoter Score: % promotores − % detractores.',
      'puntos',
      'manual',
      'mensual',
      9,
      true,
      gid_pedido,
      0.08,
      12,
      18,
      26,
      35,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Perfect order rate',
      'Pedidos completos, a tiempo, sin incidencias ni reclamos en primera entrega.',
      'porcentaje',
      'manual',
      'mensual',
      10,
      true,
      gid_cumplimiento,
      0.10,
      78,
      82,
      86,
      90,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    );
END $$;
