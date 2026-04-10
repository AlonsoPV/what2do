-- =============================================================================
-- Valor actual en catálogo: si no hay medición ni current_value, alinear con
-- baseline para que cumplimiento y score global O2C no queden "sin datos" en vacío.
-- Idempotente: solo actualiza filas con current_value NULL y baseline definido.
-- =============================================================================

UPDATE catalog_kpis
SET current_value = baseline
WHERE current_value IS NULL
  AND baseline IS NOT NULL;
