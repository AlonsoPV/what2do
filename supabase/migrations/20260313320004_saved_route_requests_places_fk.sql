-- =============================================================================
-- Permitir guardar ambas direcciones (A→B y B→A): origin_id y destination_id
-- deben poder ser IDs de orígenes o de destinos. Se crea distance_places con
-- la unión de ambos catálogos y saved_route_requests referencia a places.
-- =============================================================================

-- Tabla que contiene todos los lugares (orígenes y destinos) para FKs de saved_route_requests
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

-- Poblar con todos los orígenes y destinos (sin duplicar id)
INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
SELECT id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at
  FROM distance_origins
ON CONFLICT (id) DO NOTHING;

INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
SELECT id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at
  FROM distance_destinations
ON CONFLICT (id) DO NOTHING;

-- Quitar FKs antiguas de saved_route_requests y apuntar a distance_places
ALTER TABLE saved_route_requests
  DROP CONSTRAINT IF EXISTS saved_route_requests_origin_id_fkey,
  DROP CONSTRAINT IF EXISTS saved_route_requests_destination_id_fkey;

ALTER TABLE saved_route_requests
  ADD CONSTRAINT saved_route_requests_origin_id_fkey
    FOREIGN KEY (origin_id) REFERENCES distance_places(id) ON DELETE RESTRICT,
  ADD CONSTRAINT saved_route_requests_destination_id_fkey
    FOREIGN KEY (destination_id) REFERENCES distance_places(id) ON DELETE RESTRICT;

COMMENT ON TABLE distance_places IS 'Unión de orígenes y destinos para que saved_route_requests pueda guardar ambas direcciones (A→B y B→A).';

-- Mantener distance_places sincronizada al insertar/actualizar orígenes o destinos
CREATE OR REPLACE FUNCTION sync_distance_places_from_origin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
  VALUES (NEW.id, NEW.nombre, NEW.ubicacion, NEW.latitud, NEW.longitud, NEW.activo, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    ubicacion = EXCLUDED.ubicacion,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    activo = EXCLUDED.activo,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_distance_places_from_destination()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
  VALUES (NEW.id, NEW.nombre, NEW.ubicacion, NEW.latitud, NEW.longitud, NEW.activo, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    ubicacion = EXCLUDED.ubicacion,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    activo = EXCLUDED.activo,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_places_after_origin_insert_update
  AFTER INSERT OR UPDATE ON distance_origins
  FOR EACH ROW EXECUTE FUNCTION sync_distance_places_from_origin();

CREATE TRIGGER sync_places_after_destination_insert_update
  AFTER INSERT OR UPDATE ON distance_destinations
  FOR EACH ROW EXECUTE FUNCTION sync_distance_places_from_destination();
