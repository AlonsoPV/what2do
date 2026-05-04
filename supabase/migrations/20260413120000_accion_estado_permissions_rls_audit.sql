-- Permisos Hecho/Verificado + auditoría + RLS para que el creador pueda actualizar.
-- Reglas:
--   Hecho: solo creador (si hay created_by) o responsable; admins app (is_app_admin) omiten.
--   Verificado: solo creador con created_by no nulo; admins app omiten.
-- Nota: en cliente, roles DG/Sistemas (usuarios.rol) también omiten vía accionEstadoValidation.service;
--       is_app_admin() en BD es user_roles.app_role — pueden no coincidir con DG/Sistemas.

-- -----------------------------------------------------------------------------
-- Auditoría de cierre / verificación
-- -----------------------------------------------------------------------------

ALTER TABLE acciones_diarias
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN acciones_diarias.completed_at IS 'Primera vez que pasó a Hecho (usuarios.id en completed_by)';
COMMENT ON COLUMN acciones_diarias.completed_by IS 'usuarios.id quien marcó Hecho';
COMMENT ON COLUMN acciones_diarias.verified_at IS 'Primera vez que pasó a Verificado';
COMMENT ON COLUMN acciones_diarias.verified_by IS 'usuarios.id quien verificó';

-- -----------------------------------------------------------------------------
-- RLS: el creador puede actualizar (necesario si no es responsable)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS acciones_update_own_or_admin ON acciones_diarias;

CREATE POLICY acciones_update_responsable_creator_or_admin ON acciones_diarias
  FOR UPDATE USING (
    responsable = get_my_usuario_id()
    OR (created_by IS NOT NULL AND created_by = get_my_usuario_id())
    OR is_app_admin()
  );

-- -----------------------------------------------------------------------------
-- Trigger: permisos + relleno de auditoría (red de seguridad junto al cliente)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION acciones_diarias_guard_estado_permissions_and_audit()
RETURNS TRIGGER AS $$
DECLARE
  me uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    me := get_my_usuario_id();
    IF NEW.estado = 'Hecho'::action_status THEN
      IF NOT is_app_admin() THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la acción o el responsable asignado pueden marcar esta acción como Hecha.';
        END IF;
      END IF;
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    ELSIF NEW.estado = 'Verificado'::action_status THEN
      IF NOT is_app_admin() THEN
        IF NOT (NEW.created_by IS NOT NULL AND NEW.created_by = me) THEN
          RAISE EXCEPTION 'Solo la persona que creó esta acción puede marcarla como Verificada.';
        END IF;
      END IF;
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.verified_by := COALESCE(NEW.verified_by, me);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.estado IS DISTINCT FROM OLD.estado) THEN
    me := get_my_usuario_id();

    IF NOT is_app_admin() THEN
      IF NEW.estado = 'Hecho'::action_status THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la acción o el responsable asignado pueden marcar esta acción como Hecha.';
        END IF;
      END IF;

      IF NEW.estado = 'Verificado'::action_status THEN
        IF NOT (NEW.created_by IS NOT NULL AND NEW.created_by = me) THEN
          RAISE EXCEPTION 'Solo la persona que creó esta acción puede marcarla como Verificada.';
        END IF;
      END IF;
    END IF;

    IF NEW.estado = 'Hecho'::action_status AND OLD.estado IS DISTINCT FROM 'Hecho'::action_status THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    END IF;

    IF NEW.estado = 'Verificado'::action_status AND OLD.estado IS DISTINCT FROM 'Verificado'::action_status THEN
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.verified_by := COALESCE(NEW.verified_by, me);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS acciones_diarias_guard_estado_permissions_and_audit ON acciones_diarias;
CREATE TRIGGER acciones_diarias_guard_estado_permissions_and_audit
  BEFORE INSERT OR UPDATE OF estado ON acciones_diarias
  FOR EACH ROW EXECUTE FUNCTION acciones_diarias_guard_estado_permissions_and_audit();

COMMENT ON FUNCTION acciones_diarias_guard_estado_permissions_and_audit() IS
  'Hecho/Verificado: permisos por creador/responsable; auditoría completed_* / verified_*; admin app omite permisos.';
