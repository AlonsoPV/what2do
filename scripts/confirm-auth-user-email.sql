-- =============================================================================
-- Confirmar email de un usuario en Supabase Auth (sin pasar por el enlace del correo).
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- Usuario: auth.users.id = 1b332244-6171-4941-9373-735bac497eec (Gerardo Puga)
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID := '1b332244-6171-4941-9373-735bac497eec';
  v_updated integer;
BEGIN
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = v_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'No se encontró el usuario con id %', v_user_id;
  END IF;

  RAISE NOTICE 'Email confirmado correctamente para el usuario %', v_user_id;
END $$;
