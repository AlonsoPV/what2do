ALTER TABLE public.user_channel_identities
  DROP CONSTRAINT IF EXISTS user_channel_identities_channel_chk;

ALTER TABLE public.user_channel_identities
  ADD CONSTRAINT user_channel_identities_channel_chk
  CHECK (channel IN ('telegram', 'whatsapp'));

ALTER TABLE public.action_delivery_log
  DROP CONSTRAINT IF EXISTS action_delivery_log_channel_chk;

ALTER TABLE public.action_delivery_log
  ADD CONSTRAINT action_delivery_log_channel_chk
  CHECK (channel IN ('telegram', 'whatsapp'));

ALTER TABLE public.external_inbound_messages
  DROP CONSTRAINT IF EXISTS external_inbound_messages_channel_chk;

ALTER TABLE public.external_inbound_messages
  ADD CONSTRAINT external_inbound_messages_channel_chk
  CHECK (channel IN ('telegram', 'whatsapp'));

CREATE OR REPLACE FUNCTION public.admin_upsert_whatsapp_identity(
  p_usuario_id uuid,
  p_phone text,
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  clean_phone text;
BEGIN
  IF NOT public.has_business_role('super_admin') THEN
    RAISE EXCEPTION 'Solo super_admin puede activar WhatsApp.'
      USING ERRCODE = '42501';
  END IF;

  clean_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF p_usuario_id IS NULL OR length(clean_phone) < 10 OR length(clean_phone) > 15 THEN
    RAISE EXCEPTION 'Usuario y numero de WhatsApp valido son requeridos.'
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
    display_name,
    status,
    verified_at,
    last_seen_at,
    metadata
  )
  VALUES (
    p_usuario_id,
    'whatsapp',
    clean_phone,
    clean_phone,
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

GRANT EXECUTE ON FUNCTION public.admin_upsert_whatsapp_identity(uuid, text, text) TO authenticated;
