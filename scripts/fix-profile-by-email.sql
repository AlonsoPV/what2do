-- =============================================================================
-- Reparar perfil de usuario por email (Auth + usuarios + user_roles).
-- Ejecutar en Supabase Dashboard -> SQL Editor.
-- =============================================================================

DO $$
DECLARE
  v_email text := 'gpugawork24@gmail.com';
  v_auth_id uuid;
  v_nombre text;
  -- usuarios.rol es text (migración 13150000); valores como "Externo" no son del enum user_role.
  v_rol text;
BEGIN
  SELECT
    u.id,
    COALESCE(NULLIF(trim(u.raw_user_meta_data->>'nombre'), ''), split_part(u.email, '@', 1)),
    COALESCE(NULLIF(trim(u.raw_user_meta_data->>'rol'), ''), 'Operaciones')
  INTO v_auth_id, v_nombre, v_rol
  FROM auth.users u
  WHERE lower(u.email) = lower(v_email)
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No existe auth.users para %', v_email;
  END IF;

  -- Confirmar email para evitar bloqueo por verificación.
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = v_auth_id;

  -- Crear perfil si falta.
  INSERT INTO public.usuarios (user_id, nombre, rol, activo, onboarding_completed)
  VALUES (v_auth_id, v_nombre, v_rol, true, true)
  ON CONFLICT (user_id) DO NOTHING;

  -- Asegurar rol de aplicación mínimo (viewer) si falta.
  INSERT INTO public.user_roles (user_id, app_role)
  VALUES (v_auth_id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'OK perfil validado para % (auth id: %)', v_email, v_auth_id;
END $$;
