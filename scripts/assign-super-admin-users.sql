-- Asignar rol super_admin aceptando IDs de:
-- 1) auth.users.id
-- 2) public.usuarios.id (se resuelve a usuarios.user_id)
--
-- Ejecutar desde Supabase SQL Editor o con credenciales de service_role.

DO $$
DECLARE
  v_input_id uuid;
  v_auth_user_id uuid;
BEGIN
  FOREACH v_input_id IN ARRAY ARRAY[
    '5262608e-7b8e-4d1a-83aa-2ef819e8e50e'::uuid,
    'c00b1975-4f8f-4fc3-b228-005aa9e5374f'::uuid,
    'dd764c9f-8145-45d4-9111-0a8ec7f687e5'::uuid
  ]
  LOOP
    -- Si el UUID ya es de auth.users, úsalo directamente.
    SELECT au.id
    INTO v_auth_user_id
    FROM auth.users au
    WHERE au.id = v_input_id
    LIMIT 1;

    -- Si no existe en auth.users, intenta resolverlo desde public.usuarios.id -> user_id.
    IF v_auth_user_id IS NULL THEN
      SELECT u.user_id
      INTO v_auth_user_id
      FROM public.usuarios u
      WHERE u.id = v_input_id
      LIMIT 1;
    END IF;

    IF v_auth_user_id IS NULL THEN
      RAISE EXCEPTION 'No se encontró ese UUID ni en auth.users.id ni en public.usuarios.id: %', v_input_id;
    END IF;

    INSERT INTO public.user_roles (user_id, app_role)
    VALUES (v_auth_user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE
      SET app_role = 'super_admin',
          updated_at = now();

    RAISE NOTICE 'OK super_admin asignado. input=% -> auth_user_id=%', v_input_id, v_auth_user_id;
  END LOOP;
END $$;
