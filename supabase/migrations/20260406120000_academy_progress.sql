-- =============================================================================
-- Academia O2C: progreso individual por usuario.
-- - Un registro por usuario (UNIQUE user_id).
-- - Persistencia de módulos, pasos y quizzes aprobados.
-- =============================================================================

CREATE TABLE academy_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_modules integer[] NOT NULL DEFAULT '{}',
  completed_steps text[] NOT NULL DEFAULT '{}',
  passed_quizzes integer[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_academy_progress_user_id ON academy_progress(user_id);

CREATE TRIGGER set_academy_progress_updated_at
  BEFORE UPDATE ON academy_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_progress_select_own ON academy_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY academy_progress_insert_own ON academy_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY academy_progress_update_own ON academy_progress
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE academy_progress IS 'Progreso de la Academia O2C por usuario autenticado.';
COMMENT ON COLUMN academy_progress.completed_modules IS 'IDs de módulos completados.';
COMMENT ON COLUMN academy_progress.completed_steps IS 'Pasos completados en formato moduleId-stepIndex o moduleId-exercise.';
COMMENT ON COLUMN academy_progress.passed_quizzes IS 'IDs de módulos con quiz aprobado al 100%.';
