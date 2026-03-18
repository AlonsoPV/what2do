-- Duración ida/vuelta en solicitudes para mostrar "aprox" en la tabla
ALTER TABLE distance_requests
  ADD COLUMN IF NOT EXISTS duracion_ida_segundos integer,
  ADD COLUMN IF NOT EXISTS duracion_vuelta_segundos integer;

COMMENT ON COLUMN distance_requests.duracion_ida_segundos IS 'Duración ida en segundos (desde catálogo/Google)';
COMMENT ON COLUMN distance_requests.duracion_vuelta_segundos IS 'Duración vuelta en segundos (desde catálogo/Google)';
