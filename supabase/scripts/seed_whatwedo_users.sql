-- =============================================================================
-- Crear usuarios de acceso What2Do
--
-- Emails:
--   sergio@whatwedo.com
--   valeria@whatwedo.com
--   bruno@whatwedo.com
--   maria@whatwedo.com
--
-- Contraseña inicial: what@2026
--
-- Ejecutar en Supabase Dashboard → SQL Editor (rol postgres).
-- Idempotente: si el correo ya existe, actualiza perfil y metadata.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO public.catalog_roles (nombre, descripcion, activo)
SELECT
  'Operativo',
  'Rol operativo con acceso a kanban, calendario, notificaciones, manual y mi perfil.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalog_roles cr WHERE lower(trim(cr.nombre)) = lower('Operativo')
);

DO $$
DECLARE
  v_password constant text := 'what@2026';
  v_business_role constant text := 'Operativo';
  v_app_role constant public.app_role := 'viewer';
  v_encrypted_pw text := crypt(v_password, gen_salt('bf'));

  rec record;
  v_auth_id uuid;
  v_usuarios_id uuid;
  v_email text;
  v_meta jsonb;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('Sergio',  'sergio@whatwedo.com'),
        ('Valeria', 'valeria@whatwedo.com'),
        ('Bruno',   'bruno@whatwedo.com'),
        ('Maria',   'maria@whatwedo.com')
    ) AS t(usuario, correo)
  LOOP
    v_email := lower(trim(rec.correo));
    v_meta := jsonb_build_object(
      'nombre', rec.usuario,
      'rol', v_business_role,
      'activo', true,
      'onboarding_completed', true,
      'email', v_email
    );

    SELECT au.id
    INTO v_auth_id
    FROM auth.users au
    WHERE lower(trim(au.email)) = v_email
    LIMIT 1;

    IF v_auth_id IS NULL THEN
      v_auth_id := gen_random_uuid();

      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change,
        email_change_token_new,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        v_auth_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        v_encrypted_pw,
        now(),
        '',
        '',
        '',
        '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        v_meta,
        now(),
        now()
      );

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
        gen_random_uuid(),
        v_auth_id,
        jsonb_build_object('sub', v_auth_id::text, 'email', v_email, 'email_verified', true),
        'email',
        v_email,
        now(),
        now(),
        now()
      );

      RAISE NOTICE '[CREADO auth] % → %', rec.usuario, v_email;
    ELSE
      UPDATE auth.users
      SET
        encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        raw_user_meta_data = v_meta,
        updated_at = now()
      WHERE id = v_auth_id;

      UPDATE auth.identities
      SET
        provider_id = v_email,
        identity_data = COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object('email', v_email, 'email_verified', true, 'sub', v_auth_id::text),
        updated_at = now()
      WHERE user_id = v_auth_id
        AND provider = 'email';

      IF NOT FOUND THEN
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          v_auth_id,
          jsonb_build_object('sub', v_auth_id::text, 'email', v_email, 'email_verified', true),
          'email',
          v_email,
          now(),
          now(),
          now()
        );
      END IF;

      RAISE NOTICE '[ACTUALIZADO auth] % → %', rec.usuario, v_email;
    END IF;

    INSERT INTO public.user_roles (user_id, app_role)
    VALUES (v_auth_id, v_app_role)
    ON CONFLICT (user_id) DO UPDATE
      SET app_role = EXCLUDED.app_role,
          updated_at = now();

    SELECT u.id
    INTO v_usuarios_id
    FROM public.usuarios u
    WHERE u.user_id = v_auth_id
    LIMIT 1;

    IF v_usuarios_id IS NOT NULL THEN
      UPDATE public.usuarios
      SET
        nombre = rec.usuario,
        rol = v_business_role,
        activo = true,
        onboarding_completed = true,
        updated_at = now()
      WHERE user_id = v_auth_id;

      RAISE NOTICE '[PERFIL actualizado] usuarios.id=% auth=%', v_usuarios_id, v_auth_id;
    ELSE
      INSERT INTO public.usuarios (user_id, nombre, rol, activo, onboarding_completed)
      VALUES (v_auth_id, rec.usuario, v_business_role, true, true);

      RAISE NOTICE '[PERFIL creado] auth=%', v_auth_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Listo. Contraseña: %', v_password;
END $$;

-- Opcional: asignar super_admin a Sergio (descomentar si aplica)
-- SELECT set_first_super_admin_by_email('sergio@whatwedo.com');

-- -----------------------------------------------------------------------------
-- Verificación final
-- -----------------------------------------------------------------------------
WITH esperados AS (
  SELECT *
  FROM (
    VALUES
      ('Sergio',  'sergio@whatwedo.com'),
      ('Valeria', 'valeria@whatwedo.com'),
      ('Bruno',   'bruno@whatwedo.com'),
      ('Maria',   'maria@whatwedo.com')
  ) AS t(usuario, correo)
)
SELECT
  e.usuario,
  lower(trim(e.correo)) AS correo,
  au.id AS auth_user_id,
  au.email AS auth_email,
  u.id AS usuarios_id,
  u.nombre AS perfil_nombre,
  u.rol,
  ur.app_role,
  u.activo,
  CASE
    WHEN au.id IS NULL THEN 'FALTA auth.users'
    WHEN u.id IS NULL THEN 'FALTA perfil usuarios'
    WHEN lower(trim(au.email)) = lower(trim(e.correo)) THEN 'OK'
    ELSE 'REVISAR email'
  END AS estado
FROM esperados e
LEFT JOIN auth.users au ON lower(trim(au.email)) = lower(trim(e.correo))
LEFT JOIN public.usuarios u ON u.user_id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
ORDER BY e.usuario;

COMMIT;
