-- =============================================================================
-- Actualizar contraseña de un usuario existente en Supabase Auth.
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- Usuario: gpugawork24@gmail.com (auth.users.id = user_id en tabla usuarios)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  -- id en auth.users (en tabla usuarios es la columna user_id, no id)
  v_user_id UUID := '1b332244-6171-4941-9373-735bac497eec';
  v_encrypted_pw TEXT := crypt('envialo_mexico2026', gen_salt('bf'));
  v_updated integer;
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = v_encrypted_pw,
    updated_at = NOW()
  WHERE id = v_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'No se encontró el usuario con id %', v_user_id;
  END IF;

  RAISE NOTICE 'Contraseña actualizada correctamente para el usuario %', v_user_id;
END $$;
