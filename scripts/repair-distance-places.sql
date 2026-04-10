-- =============================================================================
-- Reparar distance_places: copia todos los IDs de orígenes y destinos.
-- Ejecutar en Supabase SQL Editor si Recalcular falla con "Origen no encontrado"
-- y la tabla distance_places existe pero le faltan filas.
-- =============================================================================

-- Crear tabla si no existe (por si solo corriste parte de las migraciones)
CREATE TABLE IF NOT EXISTS distance_places (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  ubicacion text NOT NULL,
  latitud numeric,
  longitud numeric,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_distance_places_nombre CHECK (char_length(trim(nombre)) >= 1),
  CONSTRAINT chk_distance_places_ubicacion CHECK (char_length(trim(ubicacion)) >= 1)
);

INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
SELECT id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at
FROM distance_origins
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  ubicacion = EXCLUDED.ubicacion,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  activo = EXCLUDED.activo,
  updated_at = now();

INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
SELECT id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at
FROM distance_destinations
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  ubicacion = EXCLUDED.ubicacion,
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  activo = EXCLUDED.activo,
  updated_at = now();
