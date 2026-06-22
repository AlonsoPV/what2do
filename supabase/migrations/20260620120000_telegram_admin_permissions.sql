-- Permitir vincular Telegram a quienes administran usuarios (no solo super_admin).

CREATE OR REPLACE FUNCTION public.can_manage_user_telegram()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_business_admin()
    OR public.has_business_role('Direccion');
$$;

COMMENT ON FUNCTION public.can_manage_user_telegram() IS
  'Indica si el usuario autenticado puede vincular Telegram de otros usuarios.';

CREATE OR REPLACE FUNCTION public.admin_upsert_telegram_identity(
  p_usuario_id uuid,
  p_external_chat_id text,
  p_external_user_id text DEFAULT NULL,
  p_external_username text DEFAULT NULL,
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  clean_chat_id text;
  clean_user_id text;
  clean_username text;
BEGIN
  IF NOT public.can_manage_user_telegram() THEN
    RAISE EXCEPTION 'No tienes permiso para vincular Telegram.'
      USING ERRCODE = '42501';
  END IF;

  clean_chat_id := NULLIF(btrim(p_external_chat_id), '');
  clean_user_id := COALESCE(NULLIF(btrim(p_external_user_id), ''), clean_chat_id);
  clean_username := NULLIF(regexp_replace(btrim(COALESCE(p_external_username, '')), '^@', ''), '');

  IF p_usuario_id IS NULL OR clean_chat_id IS NULL THEN
    RAISE EXCEPTION 'Usuario y chat_id son requeridos.'
      USING ERRCODE = '23502';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id = p_usuario_id AND u.activo = true
  ) THEN
    RAISE EXCEPTION 'Usuario destino no encontrado o inactivo.'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.user_channel_identities (
    usuario_id,
    channel,
    external_user_id,
    external_chat_id,
    external_username,
    display_name,
    status,
    verified_at,
    last_seen_at,
    metadata
  )
  VALUES (
    p_usuario_id,
    'telegram',
    clean_user_id,
    clean_chat_id,
    clean_username,
    NULLIF(btrim(COALESCE(p_display_name, '')), ''),
    'active',
    now(),
    now(),
    jsonb_build_object('linked_by', public.get_my_usuario_id(), 'source', 'admin_manual')
  )
  ON CONFLICT (channel, usuario_id)
  DO UPDATE SET
    external_user_id = EXCLUDED.external_user_id,
    external_chat_id = EXCLUDED.external_chat_id,
    external_username = EXCLUDED.external_username,
    display_name = EXCLUDED.display_name,
    status = 'active',
    verified_at = COALESCE(public.user_channel_identities.verified_at, now()),
    last_seen_at = now(),
    metadata = public.user_channel_identities.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

DROP POLICY IF EXISTS user_channel_identities_select_own_or_admin ON public.user_channel_identities;
CREATE POLICY user_channel_identities_select_own_or_admin ON public.user_channel_identities
  FOR SELECT TO authenticated
  USING (
    usuario_id = public.get_my_usuario_id()
    OR public.is_app_admin()
    OR public.is_business_admin()
    OR public.has_business_role('Direccion')
  );
