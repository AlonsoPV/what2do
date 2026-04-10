-- =============================================================================
-- Checkpoints / puntos a validar por acción (acciones_diarias).
-- Regla: no pasar a estado Hecho si existe algún checkpoint activo sin completar.
-- =============================================================================

CREATE TABLE accion_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  texto text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  obligatorio boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  completado boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  checked_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accion_checkpoints_texto_len CHECK (
    char_length(trim(texto)) >= 1 AND char_length(texto) <= 400
  )
);

CREATE INDEX idx_accion_checkpoints_accion_id ON accion_checkpoints(accion_id);
CREATE INDEX idx_accion_checkpoints_accion_activo ON accion_checkpoints(accion_id) WHERE activo = true;

CREATE TRIGGER set_accion_checkpoints_updated_at
  BEFORE UPDATE ON accion_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE accion_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY accion_checkpoints_select_authenticated ON accion_checkpoints
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_checkpoints_insert_responsable_or_admin ON accion_checkpoints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_checkpoints.accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

CREATE POLICY accion_checkpoints_update_responsable_or_admin ON accion_checkpoints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_checkpoints.accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

CREATE POLICY accion_checkpoints_delete_responsable_or_admin ON accion_checkpoints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_checkpoints.accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

-- Impide Hecho mientras haya checkpoints activos pendientes (independiente del cliente).
CREATE OR REPLACE FUNCTION acciones_prevent_hecho_if_checkpoints_pending()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Hecho'::action_status
     AND (OLD.estado IS DISTINCT FROM NEW.estado)
  THEN
    IF EXISTS (
      SELECT 1 FROM accion_checkpoints c
      WHERE c.accion_id = NEW.id
        AND c.activo = true
        AND c.completado = false
    ) THEN
      RAISE EXCEPTION 'No puedes marcar esta acción como Hecha porque aún existen puntos de validación pendientes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER acciones_diarias_block_hecho_checkpoints
  BEFORE UPDATE OF estado ON acciones_diarias
  FOR EACH ROW EXECUTE FUNCTION acciones_prevent_hecho_if_checkpoints_pending();

COMMENT ON TABLE accion_checkpoints IS 'Puntos a validar antes de cerrar la acción; activo=false para bajas lógicas futuras.';
COMMENT ON COLUMN accion_checkpoints.checked_by IS 'usuarios.id quien marcó completado (V1 opcional en UI).';
COMMENT ON COLUMN accion_checkpoints.obligatorio IS 'Reservado para reglas futuras; hoy todos los activos bloquean Hecho si pendientes.';
