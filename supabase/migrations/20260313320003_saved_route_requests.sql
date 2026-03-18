-- =============================================================================
-- saved_route_requests: catálogo de rutas guardadas (una fila por dirección).
-- Cada "guardado" del usuario genera dos filas: origen→destino y destino→origen.
-- La consulta siempre es por dirección exacta (A→B distinto de B→A).
-- =============================================================================

CREATE TABLE saved_route_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_id uuid NOT NULL REFERENCES distance_origins(id) ON DELETE RESTRICT,
  destination_id uuid NOT NULL REFERENCES distance_destinations(id) ON DELETE RESTRICT,
  origin_name_snapshot text,
  origin_location_snapshot text,
  destination_name_snapshot text,
  destination_location_snapshot text,
  distance_km numeric NOT NULL,
  distance_meters numeric,
  duration_seconds integer,
  route_mode text NOT NULL DEFAULT 'DRIVE',
  api_source text NOT NULL DEFAULT 'google_routes',
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_saved_route_requests_origin_dest_mode UNIQUE (origin_id, destination_id, route_mode)
);

CREATE INDEX idx_saved_route_requests_origin_dest ON saved_route_requests(origin_id, destination_id);
CREATE INDEX idx_saved_route_requests_route_mode ON saved_route_requests(route_mode);
CREATE INDEX idx_saved_route_requests_activo ON saved_route_requests(activo);
CREATE INDEX idx_saved_route_requests_created_at ON saved_route_requests(created_at DESC);

CREATE TRIGGER set_saved_route_requests_updated_at
  BEFORE UPDATE ON saved_route_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: todos los autenticados pueden leer (reutilizar rutas guardadas); insert/update solo propio
ALTER TABLE saved_route_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_route_requests_select_authenticated ON saved_route_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY saved_route_requests_insert_own ON saved_route_requests
  FOR INSERT WITH CHECK (created_by = get_my_usuario_id());

CREATE POLICY saved_route_requests_update_own ON saved_route_requests
  FOR UPDATE USING (created_by = get_my_usuario_id());

COMMENT ON TABLE saved_route_requests IS 'Rutas guardadas por dirección (una fila por origin_id→destination_id). Cada guardado crea dos filas: A→B y B→A. Lookup por dirección exacta.';
