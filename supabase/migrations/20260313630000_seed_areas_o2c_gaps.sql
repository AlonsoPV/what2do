-- =============================================================================
-- Catálogo areas: alineado a gaps O2C (20260313620000_seed_o2c_portfolio_10_kpis).
-- Inserta solo filas que aún no existan (único por lower(trim(nombre))).
-- =============================================================================

INSERT INTO areas (nombre, descripcion, activo)
SELECT v.nombre, v.descripcion, true
FROM (
  VALUES
    (
      'Comercial',
      'Pedido, oferta y relación con el cliente; alinea gaps O2C de captura y condiciones comerciales.'
    ),
    (
      'Operaciones',
      'Planificación, despacho, entrega y calidad en campo; alinea gaps O2C de cumplimiento (p. ej. OTIF, OTD).'
    ),
    (
      'Finanzas',
      'Facturación, registro contable, cobranza y gestión de capital de trabajo en el ciclo O2C.'
    ),
    (
      'Dirección',
      'Rentabilidad, experiencia de cliente y visión del ciclo pedido–cobro completo.'
    )
) AS v(nombre, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM areas a
  WHERE lower(trim(a.nombre)) = lower(trim(v.nombre))
);
