-- =============================================================================
-- Sprints Scrum: ceremonias Planning / Review / Retro integradas al kanban.
-- =============================================================================

CREATE TABLE sprints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  objetivo text,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado text NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'completado', 'cancelado')),
  velocidad_planificada integer,
  velocidad_real integer,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE acciones_diarias
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES sprints(id) ON DELETE SET NULL;

CREATE TABLE sprint_retro_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sprint_id uuid NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN ('bien', 'mejorar', 'accion')),
  texto text NOT NULL,
  autor_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_retro_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sprints_select ON sprints
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY sprints_insert ON sprints
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY sprints_update ON sprints
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY retro_select ON sprint_retro_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY retro_insert ON sprint_retro_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY retro_update ON sprint_retro_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY retro_delete ON sprint_retro_items
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_acciones_sprint ON acciones_diarias(sprint_id);
CREATE INDEX idx_retro_sprint ON sprint_retro_items(sprint_id);
CREATE INDEX idx_sprints_estado ON sprints(estado);

COMMENT ON TABLE sprints IS 'Sprints Scrum para ceremonias en el kanban (Planning, Review, Retro).';
COMMENT ON TABLE sprint_retro_items IS 'Notas de retrospectiva por sprint (bien / mejorar / acción).';
COMMENT ON COLUMN acciones_diarias.sprint_id IS 'Sprint al que pertenece la acción (opcional).';
