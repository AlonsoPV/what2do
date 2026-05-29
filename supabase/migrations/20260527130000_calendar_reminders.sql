-- =============================================================================
-- Recordatorios privados de calendario.
-- Cada usuario solo puede ver y administrar sus propios recordatorios.
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text NOT NULL,
  fecha_limite timestamptz NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_calendar_reminders_updated_at ON calendar_reminders;
CREATE TRIGGER set_calendar_reminders_updated_at
  BEFORE UPDATE ON calendar_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE calendar_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_reminders_select_own ON calendar_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_reminders.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_reminders_insert_own ON calendar_reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_reminders.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_reminders_update_own ON calendar_reminders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_reminders.user_id
        AND u.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_reminders.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_reminders_delete_own ON calendar_reminders
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = calendar_reminders.user_id
        AND u.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_calendar_reminders_user_fecha_limite
  ON calendar_reminders(user_id, fecha_limite);

CREATE INDEX IF NOT EXISTS idx_calendar_reminders_due_pending
  ON calendar_reminders(user_id, fecha_limite)
  WHERE notified_at IS NULL;

COMMENT ON TABLE calendar_reminders IS 'Recordatorios privados por usuario dentro del calendario; el cliente crea la notificacion al vencer.';
