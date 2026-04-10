-- =============================================================================
-- Crear usuario en Supabase Auth (ejecución puntual).
-- Ejecutar en Supabase Dashboard → SQL Editor (como postgres/superuser).
-- El trigger handle_new_user creará el perfil en public.usuarios.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'gpugawork24@gmail.com';
  v_encrypted_pw TEXT := crypt('envialo_mexico2026', gen_salt('bf'));
BEGIN
  -- 1. Insertar en auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre": "Usuario GPUGA", "rol": "Operaciones"}'::jsonb,
    NOW(),
    NOW()
  );

  -- 2. Enlazar identidad para que pueda iniciar sesión con email
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    format('{"sub": "%s", "email": "%s"}', v_user_id, v_email)::jsonb,
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. Asignar rol de aplicación (viewer); el trigger ya creó public.usuarios
  INSERT INTO public.user_roles (user_id, app_role)
  VALUES (v_user_id, 'viewer');

  RAISE NOTICE 'Usuario creado: % (id: %)', v_email, v_user_id;
END $$;
