-- =============================================================================
-- Notas privadas por dia en calendario.
-- Cada usuario solo puede ver y crear sus propias notas/minutas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  titulo text NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_calendar_notes_updated_at ON calendar_notes;
CREATE TRIGGER set_calendar_notes_updated_at
  BEFORE UPDATE ON calendar_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_notes_select_own ON calendar_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_notes.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_notes_insert_own ON calendar_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_notes.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_notes_update_own ON calendar_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_notes.user_id
        AND u.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_notes.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_notes_delete_own ON calendar_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_notes.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_calendar_notes_user_fecha ON calendar_notes(user_id, fecha);

COMMENT ON TABLE calendar_notes IS 'Notas/minutas privadas por usuario y dia dentro del calendario.';
