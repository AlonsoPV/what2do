-- =============================================================================
-- DEV: crear o actualizar usuarios de acceso (nbio / envialomexico)
--
-- Correos:
--   e.mendez@nbio.mx
--   i.rojas@envialomexico.com
--   g.puga@nbio.mx
--   irhec.vazquez@envialomexico.com
--   j.mejia@nbio.mx
--   jorge.gonzalez@envialomexico.com
--   l.diaz@nbio.mx
--   nancy.rojo@envialomexico.com
--   reclutamiento2@nbio.mx
--
-- Contraseña (todos): emx@2026
-- Rol de negocio: Operativo | app_role: viewer
--
-- Idempotente: si el correo ya existe, actualiza contraseña y perfil.
-- Ejecutar en Supabase DEV → SQL Editor (rol postgres).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO public.catalog_roles (nombre, descripcion, activo)
SELECT
  'Operativo',
  'Rol operativo con acceso a kanban, academia, disciplina, calendario, notificaciones, manual y mi perfil.',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalog_roles cr
  WHERE lower(trim(cr.nombre)) = lower('Operativo')
);

DO $$
DECLARE
  v_password constant text := 'emx@2026';
  v_business_role constant text := 'Operativo';
  v_app_role constant public.app_role := 'viewer';
  v_encrypted_pw text := crypt(v_password, gen_salt('bf'));

  rec record;
  v_user_id uuid;
  v_meta jsonb;
BEGIN
  -- Áreas usadas por estos perfiles
  FOR rec IN
    SELECT DISTINCT area AS nombre
    FROM (
      VALUES
        ('Operaciones'),
        ('Planeación'),
        ('Proyectos'),
        ('Sistemas'),
        ('RH'),
        ('Finanzas'),
        ('Direccion general')
    ) AS t(area)
  LOOP
    INSERT INTO public.areas (nombre, descripcion, activo)
    SELECT rec.nombre, 'Área operativa: ' || rec.nombre, true
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.areas a
      WHERE lower(trim(a.nombre)) = lower(trim(rec.nombre))
    );
  END LOOP;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('e.mendez@nbio.mx',                 'Abraham',         'Planeación'),
        ('i.rojas@envialomexico.com',        'I. Rojas',        'Operaciones'),
        ('g.puga@nbio.mx',                   'Gerardo Puga',    'Proyectos'),
        ('irhec.vazquez@envialomexico.com',  'Irhec Vazquez',   'Operaciones'),
        ('j.mejia@nbio.mx',                  'Antonio',         'Operaciones'),
        ('jorge.gonzalez@envialomexico.com', 'Jorge Gonzalez',  'Direccion general'),
        ('l.diaz@nbio.mx',                   'Leslie',          'Sistemas'),
        ('nancy.rojo@envialomexico.com',     'Nancy Rojo',      'Finanzas'),
        ('reclutamiento2@nbio.mx',           'Damaris',         'RH')
    ) AS u(email, nombre, area)
  LOOP
    v_meta := jsonb_build_object(
      'nombre', rec.nombre,
      'rol', v_business_role,
      'area', rec.area,
      'activo', true,
      'onboarding_completed', true,
      'email', lower(trim(rec.email))
    );

    SELECT au.id
    INTO v_user_id
    FROM auth.users au
    WHERE lower(trim(au.email)) = lower(trim(rec.email))
    LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

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
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        lower(trim(rec.email)),
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
        v_user_id,
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', lower(trim(rec.email)),
          'email_verified', true
        ),
        'email',
        lower(trim(rec.email)),
        now(),
        now(),
        now()
      );

      RAISE NOTICE '[CREADO] % — % (%)', rec.email, rec.nombre, rec.area;
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
      WHERE id = v_user_id;

      UPDATE auth.identities
      SET
        provider_id = lower(trim(rec.email)),
        identity_data = COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object(
            'email', lower(trim(rec.email)),
            'email_verified', true,
            'sub', v_user_id::text
          ),
        updated_at = now()
      WHERE user_id = v_user_id
        AND provider = 'email';

      IF NOT FOUND THEN
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          v_user_id,
          jsonb_build_object(
            'sub', v_user_id::text,
            'email', lower(trim(rec.email)),
            'email_verified', true
          ),
          'email',
          lower(trim(rec.email)),
          now(),
          now(),
          now()
        );
      END IF;

      RAISE NOTICE '[ACTUALIZADO] % — % (%)', rec.email, rec.nombre, rec.area;
    END IF;

    INSERT INTO public.user_roles (user_id, app_role)
    VALUES (v_user_id, v_app_role)
    ON CONFLICT (user_id) DO UPDATE
      SET app_role = EXCLUDED.app_role,
          updated_at = now();

    INSERT INTO public.usuarios (user_id, nombre, rol, area, activo, onboarding_completed)
    VALUES (v_user_id, rec.nombre, v_business_role, rec.area, true, true)
    ON CONFLICT (user_id) DO UPDATE
      SET nombre = EXCLUDED.nombre,
          rol = EXCLUDED.rol,
          area = EXCLUDED.area,
          activo = EXCLUDED.activo,
          onboarding_completed = EXCLUDED.onboarding_completed,
          updated_at = now();
  END LOOP;

  RAISE NOTICE 'Listo: 9 usuarios DEV con contraseña %', v_password;
END $$;

-- Verificación
WITH esperados AS (
  SELECT *
  FROM (
    VALUES
      ('e.mendez@nbio.mx'),
      ('i.rojas@envialomexico.com'),
      ('g.puga@nbio.mx'),
      ('irhec.vazquez@envialomexico.com'),
      ('j.mejia@nbio.mx'),
      ('jorge.gonzalez@envialomexico.com'),
      ('l.diaz@nbio.mx'),
      ('nancy.rojo@envialomexico.com'),
      ('reclutamiento2@nbio.mx')
  ) AS t(email)
)
SELECT
  e.email,
  au.id AS auth_user_id,
  u.nombre,
  u.rol,
  u.area,
  u.activo,
  ur.app_role,
  CASE
    WHEN au.id IS NULL THEN 'FALTA auth.users'
    WHEN u.id IS NULL THEN 'FALTA public.usuarios'
    ELSE 'OK'
  END AS estado
FROM esperados e
LEFT JOIN auth.users au ON lower(trim(au.email)) = lower(trim(e.email))
LEFT JOIN public.usuarios u ON u.user_id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
ORDER BY e.email;

COMMIT;
