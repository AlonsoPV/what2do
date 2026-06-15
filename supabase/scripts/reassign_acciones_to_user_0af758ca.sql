-- =============================================================================
-- Reasigna el responsable de 4 acciones al usuario con auth user_id
-- 0af758ca-779f-44d1-815c-a8916917cf67 (también acepta usuarios.id).
--
-- Acciones:
--   e5f5b954-d8fa-496b-b381-5986aa7e9c09
--   698c688a-266f-4035-a965-06135b98c55d
--   58eb9ac7-4a16-4cc9-b45e-9895b4ada182
--   26d6b1ed-fbfb-4aea-a37c-218aa201a1ab
--
-- Ejecutar en Supabase SQL Editor (dev o prod).
-- =============================================================================

-- 0) Diagnóstico del responsable destino
SELECT
  u.id AS usuarios_id,
  u.user_id AS auth_user_id,
  u.nombre,
  u.rol,
  u.area,
  au.email
FROM public.usuarios u
LEFT JOIN auth.users au ON au.id = u.user_id
WHERE u.id = '0af758ca-779f-44d1-815c-a8916917cf67'::uuid
   OR u.user_id = '0af758ca-779f-44d1-815c-a8916917cf67'::uuid;

-- 0b) Estado actual de las acciones
SELECT
  a.id,
  a.titulo_accion,
  a.fecha,
  a.estado,
  a.responsable,
  u.nombre AS responsable_nombre,
  u.user_id AS responsable_auth_id
FROM public.acciones_diarias a
LEFT JOIN public.usuarios u ON u.id = a.responsable
WHERE a.id IN (
  'e5f5b954-d8fa-496b-b381-5986aa7e9c09'::uuid,
  '698c688a-266f-4035-a965-06135b98c55d'::uuid,
  '58eb9ac7-4a16-4cc9-b45e-9895b4ada182'::uuid,
  '26d6b1ed-fbfb-4aea-a37c-218aa201a1ab'::uuid
)
ORDER BY a.titulo_accion;

DO $$
DECLARE
  v_user_ref uuid := '0af758ca-779f-44d1-815c-a8916917cf67'::uuid;
  v_action_ids uuid[] := ARRAY[
    'e5f5b954-d8fa-496b-b381-5986aa7e9c09'::uuid,
    '698c688a-266f-4035-a965-06135b98c55d'::uuid,
    '58eb9ac7-4a16-4cc9-b45e-9895b4ada182'::uuid,
    '26d6b1ed-fbfb-4aea-a37c-218aa201a1ab'::uuid
  ];
  v_resp uuid;
  v_missing uuid[];
  v_auth_email text;
  v_updated int := 0;
BEGIN
  SELECT u.id
  INTO v_resp
  FROM public.usuarios u
  WHERE u.id = v_user_ref OR u.user_id = v_user_ref
  LIMIT 1;

  IF v_resp IS NULL THEN
    SELECT au.email
    INTO v_auth_email
    FROM auth.users au
    WHERE au.id = v_user_ref;

    IF v_auth_email IS NOT NULL THEN
      RAISE EXCEPTION
        'Existe auth.users (email=%) pero no hay fila en public.usuarios para user_id=%. Crea la ficha de negocio primero.',
        v_auth_email,
        v_user_ref;
    END IF;

    RAISE EXCEPTION 'Usuario no encontrado (ni usuarios.id ni auth.users.id): %', v_user_ref;
  END IF;

  SELECT array_agg(ref.id)
  INTO v_missing
  FROM unnest(v_action_ids) AS ref(id)
  LEFT JOIN public.acciones_diarias a ON a.id = ref.id
  WHERE a.id IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Acciones no encontradas: %', v_missing;
  END IF;

  UPDATE public.acciones_diarias
  SET
    responsable = v_resp,
    updated_at = now()
  WHERE id = ANY (v_action_ids)
    AND responsable IS DISTINCT FROM v_resp;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RAISE NOTICE 'Responsable actualizado a usuarios.id=% en % accion(es).', v_resp, v_updated;
END $$;

-- 1) Verificación final
SELECT
  a.id,
  a.titulo_accion,
  a.fecha,
  a.estado,
  a.responsable,
  u.nombre AS responsable_nombre,
  u.user_id AS responsable_auth_id,
  au.email AS responsable_email
FROM public.acciones_diarias a
JOIN public.usuarios u ON u.id = a.responsable
LEFT JOIN auth.users au ON au.id = u.user_id
WHERE a.id IN (
  'e5f5b954-d8fa-496b-b381-5986aa7e9c09'::uuid,
  '698c688a-266f-4035-a965-06135b98c55d'::uuid,
  '58eb9ac7-4a16-4cc9-b45e-9895b4ada182'::uuid,
  '26d6b1ed-fbfb-4aea-a37c-218aa201a1ab'::uuid
)
ORDER BY a.titulo_accion;
