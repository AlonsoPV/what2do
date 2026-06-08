-- =============================================================================
-- Crear o actualizar correos de acceso en Supabase Auth
--
-- Casos:
--   A) Usuario ya en auth.users → actualiza email al correo nuevo
--   B) Usuario no existe → crea auth.users + auth.identities + public.usuarios
--
-- uid_tabla = public.usuarios.id deseado (tabla de negocio)
-- auth.users.id se genera al crear; en Gerardo ya coincide con uid_tabla
--
-- Contraseña inicial al CREAR: emx@2026 (cambiar tras primer acceso)
-- Ejecutar en Supabase Dashboard → SQL Editor (rol postgres).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO public.catalog_roles (nombre, descripcion, activo)
SELECT
  'Operativo',
  'Rol operativo con acceso a kanban, academia, disciplina, calendario, notificaciones, manual y mi perfil.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalog_roles cr WHERE lower(trim(cr.nombre)) = lower('Operativo')
);

DO $$
DECLARE
  v_password constant text := 'emx@2026';
  v_business_role constant text := 'Operativo';
  v_app_role constant public.app_role := 'viewer';
  v_encrypted_pw text := crypt(v_password, gen_salt('bf'));

  rec record;
  v_auth_id uuid;
  v_usuarios_id uuid;
  v_email_nuevo text;
  v_meta jsonb;
  v_existe_por_email_nuevo boolean;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('7e16053e-a2ae-44a6-b9ed-3966754cd5b7'::uuid, 'Jorge Gonzalez',  'jorgegonzalez@emx.mx',   'jorge.gonzalez@envialomexico.com', 'Direccion general'),
        ('0af758ca-779f-44d1-815c-a8916917cf67'::uuid, 'Gerardo Puga',    'gerardopuga@emx.mx',     'g.puga@nbio.mx',                   'Proyectos'),
        ('848bbe04-0115-41d4-b9b2-8e8c2cfee6dc'::uuid, 'Leslie',          'leslie@emx.mx',          'l.diaz@nbio.mx',                   'Sistemas'),
        ('14afe802-8187-4db5-a13b-37c01adba157'::uuid, 'Damaris',         'damaris@emx.mx',         'reclutamiento2@nbio.mx',           'RH'),
        ('50819182-cb32-46e3-b11a-7bd28d3e3e3b'::uuid, 'Nancy Rojo',      'nancyrojo@emx.mx',       'nancy.rojo@envialomexico.com',     'Finanzas'),
        ('317465b7-f009-4635-9a27-a05d14c7c619'::uuid, 'Abraham',         'abraham@emx.mx',         'e.mendez@nbio.mx',                 'Planeación'),
        ('10e80eb8-7ec5-4dfb-98dd-11e37866d762'::uuid, 'Antonio',         'antonio@nbio.mx',        'j.mejia@nbio.mx',                  'Operaciones')
    ) AS t(uid_tabla, usuario, correo_actual, correo_nuevo, area)
  LOOP
    v_email_nuevo := lower(trim(rec.correo_nuevo));
    v_meta := jsonb_build_object(
      'nombre', rec.usuario,
      'rol', v_business_role,
      'area', rec.area,
      'activo', true,
      'onboarding_completed', true,
      'email', v_email_nuevo
    );

    -- Resolver auth.users.id
    SELECT COALESCE(au_uid.id, u.user_id, au_old.id, au_new.id)
    INTO v_auth_id
    FROM (SELECT 1) x
    LEFT JOIN auth.users au_uid ON au_uid.id = rec.uid_tabla
    LEFT JOIN public.usuarios u ON u.id = rec.uid_tabla
    LEFT JOIN auth.users au_old ON lower(trim(au_old.email)) = lower(trim(rec.correo_actual))
    LEFT JOIN auth.users au_new ON lower(trim(au_new.email)) = v_email_nuevo;

    SELECT EXISTS (
      SELECT 1 FROM auth.users au WHERE lower(trim(au.email)) = v_email_nuevo
    )
    INTO v_existe_por_email_nuevo;

    IF v_auth_id IS NULL AND v_existe_por_email_nuevo THEN
      SELECT au.id INTO v_auth_id
      FROM auth.users au
      WHERE lower(trim(au.email)) = v_email_nuevo
      LIMIT 1;
    END IF;

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
        v_email_nuevo,
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
        jsonb_build_object('sub', v_auth_id::text, 'email', v_email_nuevo, 'email_verified', true),
        'email',
        v_email_nuevo,
        now(),
        now(),
        now()
      );

      RAISE NOTICE '[CREADO auth] % → %', rec.usuario, v_email_nuevo;
    ELSE
      UPDATE auth.users
      SET
        email = v_email_nuevo,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        raw_user_meta_data = v_meta,
        updated_at = now()
      WHERE id = v_auth_id
        AND lower(trim(email)) IS DISTINCT FROM v_email_nuevo;

      UPDATE auth.identities
      SET
        provider_id = v_email_nuevo,
        identity_data = COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object('email', v_email_nuevo, 'email_verified', true, 'sub', v_auth_id::text),
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
          jsonb_build_object('sub', v_auth_id::text, 'email', v_email_nuevo, 'email_verified', true),
          'email',
          v_email_nuevo,
          now(),
          now(),
          now()
        );
      END IF;

      RAISE NOTICE '[ACTUALIZADO auth] % → %', rec.usuario, v_email_nuevo;
    END IF;

    INSERT INTO public.user_roles (user_id, app_role)
    VALUES (v_auth_id, v_app_role)
    ON CONFLICT (user_id) DO UPDATE
      SET app_role = EXCLUDED.app_role,
          updated_at = now();

    -- Perfil de negocio: si ya existe por user_id (ej. Gerardo), actualizar sin duplicar
    SELECT u.id INTO v_usuarios_id
    FROM public.usuarios u
    WHERE u.user_id = v_auth_id
    LIMIT 1;

    IF v_usuarios_id IS NOT NULL THEN
      UPDATE public.usuarios
      SET
        nombre = rec.usuario,
        rol = v_business_role,
        area = rec.area,
        activo = true,
        onboarding_completed = true,
        updated_at = now()
      WHERE user_id = v_auth_id;

      RAISE NOTICE '[PERFIL por user_id] usuarios.id=% auth=%', v_usuarios_id, v_auth_id;
    ELSIF EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = rec.uid_tabla) THEN
      UPDATE public.usuarios
      SET
        user_id = v_auth_id,
        nombre = rec.usuario,
        rol = v_business_role,
        area = rec.area,
        activo = true,
        onboarding_completed = true,
        updated_at = now()
      WHERE id = rec.uid_tabla;

      RAISE NOTICE '[PERFIL por id] usuarios.id=% auth=%', rec.uid_tabla, v_auth_id;
    ELSE
      INSERT INTO public.usuarios (id, user_id, nombre, rol, area, activo, onboarding_completed)
      VALUES (rec.uid_tabla, v_auth_id, rec.usuario, v_business_role, rec.area, true, true);

      RAISE NOTICE '[PERFIL creado] usuarios.id=% auth=%', rec.uid_tabla, v_auth_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Listo. Contraseña inicial (usuarios nuevos): %', v_password;
END $$;

-- -----------------------------------------------------------------------------
-- Verificación final
-- -----------------------------------------------------------------------------
WITH cambios AS (
  SELECT *
  FROM (
    VALUES
      ('7e16053e-a2ae-44a6-b9ed-3966754cd5b7'::uuid, 'Jorge Gonzalez',  'jorge.gonzalez@envialomexico.com'),
      ('0af758ca-779f-44d1-815c-a8916917cf67'::uuid, 'Gerardo Puga',    'g.puga@nbio.mx'),
      ('848bbe04-0115-41d4-b9b2-8e8c2cfee6dc'::uuid, 'Leslie',          'l.diaz@nbio.mx'),
      ('14afe802-8187-4db5-a13b-37c01adba157'::uuid, 'Damaris',         'reclutamiento2@nbio.mx'),
      ('50819182-cb32-46e3-b11a-7bd28d3e3e3b'::uuid, 'Nancy Rojo',      'nancy.rojo@envialomexico.com'),
      ('317465b7-f009-4635-9a27-a05d14c7c619'::uuid, 'Abraham',         'e.mendez@nbio.mx'),
      ('10e80eb8-7ec5-4dfb-98dd-11e37866d762'::uuid, 'Antonio',         'j.mejia@nbio.mx')
  ) AS t(uid_tabla, usuario, correo_nuevo)
)
SELECT
  c.uid_tabla,
  c.usuario,
  lower(trim(c.correo_nuevo)) AS correo_nuevo,
  au.id AS auth_user_id,
  au.email AS auth_email_resultado,
  u.id AS usuarios_id,
  u.nombre AS perfil_nombre,
  u.activo,
  CASE
    WHEN au.id IS NULL THEN 'FALTA auth.users'
    WHEN u.id IS NULL THEN 'FALTA perfil usuarios'
    WHEN lower(trim(au.email)) = lower(trim(c.correo_nuevo)) THEN 'OK'
    ELSE 'REVISAR email'
  END AS estado
FROM cambios c
LEFT JOIN auth.users au ON lower(trim(au.email)) = lower(trim(c.correo_nuevo))
LEFT JOIN public.usuarios u ON u.user_id = au.id
ORDER BY c.usuario;

COMMIT;
