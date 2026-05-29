-- =============================================================================
-- Cumplimiento manual de recordatorios.
-- Permite cerrar/cumplir un recordatorio antes de su fecha limite y evita que
-- genere notificaciones posteriores.
-- =============================================================================

ALTER TABLE calendar_reminders
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_reminders_pending_completion
  ON calendar_reminders(user_id, fecha_limite)
  WHERE completed_at IS NULL;

COMMENT ON COLUMN calendar_reminders.completed_at IS 'Fecha en que el usuario marco el recordatorio como cumplido/cerrado.';
COMMENT ON COLUMN calendar_reminders.completed_by IS 'usuarios.id del usuario que marco el recordatorio como cumplido/cerrado.';
