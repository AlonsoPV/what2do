-- =============================================================================
-- Disciplina ejecutiva: scores, streaks, badges, niveles y achievements.
-- Las tablas guardan snapshots/reconocimientos; las formulas viven en frontend
-- centralizadas en src/features/disciplina/utils para evitar calculos dispersos.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_execution_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_streaks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  streak_type text NOT NULL,
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  best_value integer NOT NULL DEFAULT 0 CHECK (best_value >= 0),
  started_at date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, streak_type)
);

CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  unlock_rule text NOT NULL,
  icon text NOT NULL DEFAULT 'award',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS team_health_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id text NOT NULL,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_levels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  rule text NOT NULL,
  category text NOT NULL DEFAULT 'score',
  icon text NOT NULL DEFAULT 'medal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE user_execution_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_execution_scores_select ON user_execution_scores
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY user_execution_scores_write ON user_execution_scores
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY user_streaks_select ON user_streaks
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY user_streaks_write ON user_streaks
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY badges_select ON badges
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY badges_write ON badges
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY user_badges_select ON user_badges
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY user_badges_write ON user_badges
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY team_health_scores_select ON team_health_scores
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY team_health_scores_write ON team_health_scores
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY user_levels_select ON user_levels
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY user_levels_write ON user_levels
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY achievements_select ON achievements
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY achievements_write ON achievements
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY user_achievements_select ON user_achievements
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY user_achievements_write ON user_achievements
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_user_execution_scores_user_calculated
  ON user_execution_scores(user_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_team_health_scores_team_calculated
  ON team_health_scores(team_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_levels_user ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

INSERT INTO badges (name, description, unlock_rule, icon)
VALUES
  ('Execution Driver', 'Sostiene ejecucion confiable y verificable.', 'Score mayor a 85.', 'target'),
  ('Gap Closer', 'Convierte brechas en acciones cerradas.', 'Cerrar acciones vinculadas a 5 gaps.', 'gap'),
  ('Data Champion', 'Cierra con evidencia y trazabilidad.', 'Evidencia en al menos 90% de cierres.', 'data'),
  ('Sprint Leader', 'Aporta al avance de esfuerzos CHANGE.', 'Contribuir en 3 sprints.', 'sprint'),
  ('Lean Operator', 'Mantiene flujo operativo sin vencidas.', '10 dias consecutivos sin vencidas.', 'flow'),
  ('Process Optimizer', 'Eleva calidad sin premiar volumen vacio.', 'Score mayor a 80 y 10 cierres verificados.', 'process'),
  ('High Performer', 'Ejecucion consistente de alto estandar.', 'Score mayor a 80 con cadencia activa.', 'performance'),
  ('Transformation Leader', 'Impacta gaps, sprints y accountability.', 'Score mayor a 90, gaps y sprints activos.', 'transformation')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  unlock_rule = EXCLUDED.unlock_rule,
  icon = EXCLUDED.icon,
  updated_at = now();

INSERT INTO achievements (name, description, rule, category, icon)
VALUES
  ('Primer sprint completado', 'Primera contribucion cerrada dentro de un sprint.', 'Contribuir con una accion cerrada en sprint.', 'sprint', 'sprint'),
  ('Primer gap critico resuelto', 'Primer cierre con trazabilidad hacia una brecha.', 'Cerrar una accion vinculada a gap.', 'gap', 'gap'),
  ('30 dias sin acciones vencidas', 'Consistencia operativa sin atrasos visibles.', 'Mantener 30 dias consecutivos sin vencidas.', 'consistency', 'calendar'),
  ('100 acciones verificadas', 'Volumen relevante solo cuando existe verificacion.', 'Alcanzar 100 acciones verificadas.', 'quality', 'check'),
  ('Primer sprint estrategico liderado', 'Contribucion CHANGE con impacto verificable.', 'Cerrar 5 acciones sprint con score mayor a 80.', 'sprint', 'leader'),
  ('Cultura de ejecucion', 'Tres reconocimientos estrategicos desbloqueados.', 'Desbloquear 3 badges estrategicos.', 'score', 'culture')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  rule = EXCLUDED.rule,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  updated_at = now();

COMMENT ON TABLE user_execution_scores IS 'Snapshots del Execution Score individual por usuario.';
COMMENT ON TABLE user_streaks IS 'Rachas operativas por usuario: consistencia, sin vencidas y contribucion sprint.';
COMMENT ON TABLE badges IS 'Catalogo de reconocimientos ejecutivos desbloqueables.';
COMMENT ON TABLE user_badges IS 'Badges desbloqueados por usuario.';
COMMENT ON TABLE team_health_scores IS 'Snapshots de salud operativa por equipo o area.';
COMMENT ON TABLE user_levels IS 'Nivel de madurez operativa por usuario.';
COMMENT ON TABLE achievements IS 'Catalogo de hitos operativos relevantes.';
COMMENT ON TABLE user_achievements IS 'Achievements desbloqueados por usuario.';
