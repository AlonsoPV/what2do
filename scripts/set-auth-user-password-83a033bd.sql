-- =============================================================================
-- Cambiar contraseña en Supabase Auth (auth.users) por UUID.
-- Usuario: auth.users.id = 83a033bd-e273-4314-8c9a-6a6bd8f4400e
--
-- Ejecutar en: Supabase Dashboard → SQL Editor (rol con permiso sobre auth).
--
-- ANTES DE EJECUTAR: sustituí la contraseña entre $pw$ ... $pw$ (línea v_plain).
-- Alternativa recomendada (sin SQL): desde la raíz del repo, con .env cargado:
--   node scripts/set-user-password.mjs 83a033bd-e273-4314-8c9a-6a6bd8f4400e "tu_nueva_clave"
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := '83a033bd-e273-4314-8c9a-6a6bd8f4400e';
  -- Sustituí solo el texto entre $pw$ y $pw$ (permite comillas y símbolos en la clave)
  v_plain text := $pw$CAMBIAR_ESTA_CONTRASEÑA$pw$;
  v_encrypted_pw text;
  v_updated integer;
BEGIN
  IF v_plain = 'CAMBIAR_ESTA_CONTRASEÑA' THEN
    RAISE EXCEPTION 'Editá v_plain en el script y poné la contraseña real entre $pw$...$pw$.';
  END IF;

  v_encrypted_pw := crypt(v_plain, gen_salt('bf'));

  UPDATE auth.users
  SET
    encrypted_password = v_encrypted_pw,
    updated_at = now()
  WHERE id = v_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'No existe fila en auth.users con id %', v_user_id;
  END IF;

  RAISE NOTICE 'Contraseña actualizada para auth.users.id = %', v_user_id;
END $$;
