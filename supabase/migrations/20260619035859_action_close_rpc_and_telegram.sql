-- =============================================================================
-- Cierre transaccional de acciones + bases para integracion Telegram.
--
-- Objetivo:
-- - Un unico RPC valida permisos, checklist y evidencia antes de pasar a Hecho.
-- - Los canales externos pueden operar con service_role sin saltarse reglas.
-- - Telegram queda preparado para Fase 1 (envio de accion) y Fase 2
--   (checklist + recepcion de documentos).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de cierre
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_business_admin_usuario(p_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = p_usuario_id
      AND u.activo = true
      AND public.normalize_business_role(u.rol::text) IN (
        public.normalize_business_role('DG'),
        public.normalize_business_role('Sistemas'),
        public.normalize_business_role('super_admin')
      )
  );
$$;

COMMENT ON FUNCTION public.is_business_admin_usuario(uuid) IS
  'Indica si usuarios.id tiene rol de negocio con privilegios admin.';

CREATE OR REPLACE FUNCTION public.is_app_admin_usuario(p_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    JOIN public.user_roles ur ON ur.user_id = u.user_id
    WHERE u.id = p_usuario_id
      AND u.activo = true
      AND ur.app_role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_app_admin_usuario(uuid) IS
  'Indica si usuarios.id tiene app_role admin.';

CREATE OR REPLACE FUNCTION public.can_close_accion_as(
  p_accion_id uuid,
  p_usuario_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.acciones_diarias a
    JOIN public.usuarios u ON u.id = p_usuario_id
    WHERE a.id = p_accion_id
      AND u.activo = true
      AND (
        a.responsable = p_usuario_id
        OR (a.created_by IS NOT NULL AND a.created_by = p_usuario_id)
        OR public.is_app_admin_usuario(p_usuario_id)
        OR public.is_business_admin_usuario(p_usuario_id)
      )
  );
$$;

COMMENT ON FUNCTION public.can_close_accion_as(uuid, uuid) IS
  'Permiso efectivo para cerrar una accion como usuarios.id.';

CREATE OR REPLACE FUNCTION public.accion_requires_evidencia_text(p_evidencia_esperada text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN btrim(coalesce(p_evidencia_esperada, '')) = '' THEN false
    WHEN public.normalize_business_role(p_evidencia_esperada) IN (
      'opcional',
      'no aplica',
      'n/a',
      'na',
      'sin evidencia',
      'sin evidencia requerida',
      'no requiere evidencia'
    ) THEN false
    ELSE true
  END;
$$;

COMMENT ON FUNCTION public.accion_requires_evidencia_text(text) IS
  'Determina si el texto de evidencia esperada exige adjuntos para cerrar.';

CREATE OR REPLACE FUNCTION public.accion_has_evidencia(p_accion_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accion_evidencias ev
    WHERE ev.accion_id = p_accion_id
  );
$$;

COMMENT ON FUNCTION public.accion_has_evidencia(uuid) IS
  'True si existe al menos un registro en accion_evidencias para la accion.';

CREATE OR REPLACE FUNCTION public.try_set_accion_hecho(
  p_accion_id uuid,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  action_row public.acciones_diarias%ROWTYPE;
  pending_count integer;
  requires_evidence boolean;
  has_evidence boolean;
BEGIN
  actor_id := COALESCE(p_usuario_id, public.get_my_usuario_id());

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado.'
      USING ERRCODE = '42501';
  END IF;

  IF p_usuario_id IS NOT NULL
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND p_usuario_id IS DISTINCT FROM public.get_my_usuario_id()
  THEN
    RAISE EXCEPTION 'No puedes cerrar acciones en nombre de otro usuario.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO action_row
  FROM public.acciones_diarias
  WHERE id = p_accion_id
  FOR UPDATE;

  IF action_row.id IS NULL THEN
    RAISE EXCEPTION 'Accion no encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  IF action_row.estado = 'Verificado'::action_status THEN
    RAISE EXCEPTION 'La accion ya esta verificada y no puede modificarse.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.can_close_accion_as(p_accion_id, actor_id) THEN
    RAISE EXCEPTION 'No tienes permiso para marcar esta accion como Hecha.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
  INTO pending_count
  FROM public.accion_checkpoints c
  WHERE c.accion_id = p_accion_id
    AND c.activo = true
    AND c.completado = false;

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'No puedes marcar esta accion como Hecha porque aun existen puntos de validacion pendientes.'
      USING ERRCODE = '23514';
  END IF;

  requires_evidence := public.accion_requires_evidencia_text(action_row.evidencia_esperada);
  has_evidence := action_row.evidencia_cargada OR public.accion_has_evidencia(p_accion_id);

  IF requires_evidence AND NOT has_evidence THEN
    RAISE EXCEPTION 'No se puede marcar como Hecho sin evidencia cargada.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.acciones_diarias
  SET
    estado = 'Hecho'::action_status,
    evidencia_cargada = CASE WHEN has_evidence THEN true ELSE evidencia_cargada END,
    completed_at = COALESCE(completed_at, now()),
    completed_by = COALESCE(completed_by, actor_id),
    updated_by = actor_id
  WHERE id = p_accion_id
    AND estado IS DISTINCT FROM 'Hecho'::action_status;

  RETURN jsonb_build_object(
    'ok', true,
    'accion_id', p_accion_id,
    'estado', 'Hecho',
    'closed_by', actor_id
  );
END;
$$;

COMMENT ON FUNCTION public.try_set_accion_hecho(uuid, uuid) IS
  'Cierra una accion en una transaccion: permisos + checklist completo + evidencia cuando aplica.';

GRANT EXECUTE ON FUNCTION public.try_set_accion_hecho(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_set_accion_hecho(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.acciones_prevent_hecho_if_evidencia_missing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_evidence boolean;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Hecho'::action_status
     AND OLD.estado IS DISTINCT FROM NEW.estado
     AND public.accion_requires_evidencia_text(NEW.evidencia_esperada)
  THEN
    has_evidence := NEW.evidencia_cargada OR public.accion_has_evidencia(NEW.id);
    IF NOT has_evidence THEN
      RAISE EXCEPTION 'No se puede marcar como Hecho sin evidencia cargada.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acciones_diarias_block_hecho_evidencia ON public.acciones_diarias;
CREATE TRIGGER acciones_diarias_block_hecho_evidencia
  BEFORE UPDATE OF estado ON public.acciones_diarias
  FOR EACH ROW
  EXECUTE FUNCTION public.acciones_prevent_hecho_if_evidencia_missing();

COMMENT ON FUNCTION public.acciones_prevent_hecho_if_evidencia_missing() IS
  'Red de seguridad: impide pasar a Hecho sin evidencia cuando aplica.';

CREATE OR REPLACE FUNCTION public.acciones_diarias_guard_estado_permissions_and_audit()
RETURNS TRIGGER AS $$
DECLARE
  me uuid;
  can_admin boolean;
  is_server_role boolean;
BEGIN
  me := public.get_my_usuario_id();
  is_server_role := auth.role() = 'service_role';
  can_admin := is_server_role OR public.is_app_admin() OR public.is_business_admin();

  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'Hecho'::action_status THEN
      IF NOT can_admin THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden marcar esta accion como Hecha.';
        END IF;
      END IF;
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    ELSIF NEW.estado = 'Verificado'::action_status THEN
      IF NOT can_admin THEN
        IF NOT (NEW.created_by IS NOT NULL AND NEW.created_by = me) THEN
          RAISE EXCEPTION 'Solo la persona que creo esta accion puede marcarla como Verificada.';
        END IF;
      END IF;
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.verified_by := COALESCE(NEW.verified_by, me);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.estado IS DISTINCT FROM OLD.estado) THEN
    IF NOT can_admin THEN
      IF NEW.estado = 'Hecho'::action_status THEN
        IF NOT (
          (NEW.created_by IS NOT NULL AND NEW.created_by = me)
          OR NEW.responsable = me
        ) THEN
          RAISE EXCEPTION 'Solo la persona creadora de la accion o el responsable asignado pueden marcar esta accion como Hecha.';
        END IF;
      END IF;

      IF NEW.estado = 'Verificado'::action_status THEN
        IF NOT (NEW.created_by IS NOT NULL AND NEW.created_by = me) THEN
          RAISE EXCEPTION 'Solo la persona que creo esta accion puede marcarla como Verificada.';
        END IF;
      END IF;
    END IF;

    IF NEW.estado = 'Hecho'::action_status AND OLD.estado IS DISTINCT FROM 'Hecho'::action_status THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      NEW.completed_by := COALESCE(NEW.completed_by, me);
    END IF;

    IF NEW.estado = 'Verificado'::action_status AND OLD.estado IS DISTINCT FROM 'Verificado'::action_status THEN
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      NEW.verified_by := COALESCE(NEW.verified_by, me);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.acciones_diarias_guard_estado_permissions_and_audit() IS
  'Hecho/Verificado: permisos por creador/responsable/admin; permite RPC server-side con auditoria preasignada.';

-- Reemplaza el cierre automatico anterior: completar el ultimo checkpoint intenta
-- cerrar solo si ya existe evidencia; si no existe, deja el checklist completo.
CREATE OR REPLACE FUNCTION public.set_accion_checkpoint_completado(
  p_checkpoint_id uuid,
  p_completado boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  v_accion_id uuid;
  v_creator uuid;
  v_responsable uuid;
  can_admin boolean;
  can_try_close boolean;
BEGIN
  me := public.get_my_usuario_id();
  can_admin := public.is_app_admin() OR public.is_business_admin();

  SELECT c.accion_id, a.created_by, a.responsable
  INTO v_accion_id, v_creator, v_responsable
  FROM public.accion_checkpoints c
  JOIN public.acciones_diarias a ON a.id = c.accion_id
  WHERE c.id = p_checkpoint_id
    AND c.activo = true;

  IF v_accion_id IS NULL THEN
    RAISE EXCEPTION 'Punto de checklist no encontrado o inactivo.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    can_admin
    OR (v_creator IS NOT NULL AND v_creator = me)
    OR v_responsable = me
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para marcar este punto del checklist.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.accion_checkpoints
  SET
    completado = p_completado,
    checked_at = CASE WHEN p_completado THEN now() ELSE NULL END,
    checked_by = CASE WHEN p_completado THEN me ELSE NULL END
  WHERE id = p_checkpoint_id;

  IF p_completado THEN
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.accion_checkpoints pending
      WHERE pending.accion_id = v_accion_id
        AND pending.activo = true
        AND pending.completado = false
    )
    INTO can_try_close;

    IF can_try_close THEN
      BEGIN
        PERFORM public.try_set_accion_hecho(v_accion_id, me);
      EXCEPTION
        WHEN check_violation THEN
          -- Checklist completo sin evidencia: se conserva el check y el usuario
          -- puede subir evidencia y cerrar despues.
          NULL;
      END;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_accion_checkpoint_completado(uuid, boolean) IS
  'Marca/desmarca un punto y solo cierra automaticamente si checklist y evidencia cumplen.';

CREATE OR REPLACE FUNCTION public.set_accion_checkpoint_completado_for_usuario(
  p_checkpoint_id uuid,
  p_completado boolean,
  p_usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accion_id uuid;
  can_try_close boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Funcion reservada para integraciones de servidor.'
      USING ERRCODE = '42501';
  END IF;

  SELECT c.accion_id
  INTO v_accion_id
  FROM public.accion_checkpoints c
  WHERE c.id = p_checkpoint_id
    AND c.activo = true;

  IF v_accion_id IS NULL THEN
    RAISE EXCEPTION 'Punto de checklist no encontrado o inactivo.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_close_accion_as(v_accion_id, p_usuario_id) THEN
    RAISE EXCEPTION 'No tienes permiso para marcar este punto del checklist.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.accion_checkpoints
  SET
    completado = p_completado,
    checked_at = CASE WHEN p_completado THEN now() ELSE NULL END,
    checked_by = CASE WHEN p_completado THEN p_usuario_id ELSE NULL END
  WHERE id = p_checkpoint_id;

  IF p_completado THEN
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.accion_checkpoints pending
      WHERE pending.accion_id = v_accion_id
        AND pending.activo = true
        AND pending.completado = false
    )
    INTO can_try_close;

    IF can_try_close THEN
      BEGIN
        RETURN public.try_set_accion_hecho(v_accion_id, p_usuario_id);
      EXCEPTION
        WHEN check_violation THEN
          RETURN jsonb_build_object(
            'ok', true,
            'accion_id', v_accion_id,
            'estado', 'Checklist completo',
            'needs_evidence', true
          );
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'accion_id', v_accion_id);
END;
$$;

COMMENT ON FUNCTION public.set_accion_checkpoint_completado_for_usuario(uuid, boolean, uuid) IS
  'Marca un checkpoint desde integraciones server-side atribuyendo auditoria a usuarios.id.';

GRANT EXECUTE ON FUNCTION public.set_accion_checkpoint_completado_for_usuario(uuid, boolean, uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- Tablas de identidad, entregas y webhooks externos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token text PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_link_tokens_token_len CHECK (char_length(token) BETWEEN 16 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_usuario
  ON public.telegram_link_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expires
  ON public.telegram_link_tokens(expires_at);

ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telegram_link_tokens_select_own_or_admin ON public.telegram_link_tokens;
CREATE POLICY telegram_link_tokens_select_own_or_admin ON public.telegram_link_tokens
  FOR SELECT TO authenticated
  USING (public.has_business_role('super_admin'));

CREATE OR REPLACE FUNCTION public.create_telegram_link_token(
  p_usuario_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  target_id uuid;
  new_token text;
BEGIN
  me := public.get_my_usuario_id();
  target_id := COALESCE(p_usuario_id, me);

  IF me IS NULL THEN
    RAISE EXCEPTION 'No autorizado.'
      USING ERRCODE = '42501';
  END IF;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Usuario destino requerido.'
      USING ERRCODE = '23502';
  END IF;

  IF target_id IS DISTINCT FROM me
     AND NOT public.has_business_role('super_admin')
  THEN
    RAISE EXCEPTION 'Solo puedes vincular tu propio Telegram.'
      USING ERRCODE = '42501';
  END IF;

  new_token := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.telegram_link_tokens (token, usuario_id, created_by)
  VALUES (new_token, target_id, me);

  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_telegram_link_token(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_channel_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_user_id text NOT NULL,
  external_chat_id text NOT NULL,
  external_username text,
  display_name text,
  status text NOT NULL DEFAULT 'active',
  verified_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_channel_identities_channel_chk CHECK (channel IN ('telegram')),
  CONSTRAINT user_channel_identities_status_chk CHECK (status IN ('active', 'paused', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_channel_identities_channel_external_user
  ON public.user_channel_identities(channel, external_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_channel_identities_channel_usuario
  ON public.user_channel_identities(channel, usuario_id);
CREATE INDEX IF NOT EXISTS idx_user_channel_identities_external_chat
  ON public.user_channel_identities(channel, external_chat_id);

DROP TRIGGER IF EXISTS set_user_channel_identities_updated_at ON public.user_channel_identities;
CREATE TRIGGER set_user_channel_identities_updated_at
  BEFORE UPDATE ON public.user_channel_identities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_channel_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_channel_identities_select_own_or_admin ON public.user_channel_identities;
CREATE POLICY user_channel_identities_select_own_or_admin ON public.user_channel_identities
  FOR SELECT TO authenticated
  USING (
    usuario_id = public.get_my_usuario_id()
    OR public.is_app_admin()
    OR public.is_business_admin()
  );

DROP POLICY IF EXISTS user_channel_identities_update_own ON public.user_channel_identities;
CREATE POLICY user_channel_identities_update_own ON public.user_channel_identities
  FOR UPDATE TO authenticated
  USING (usuario_id = public.get_my_usuario_id())
  WITH CHECK (usuario_id = public.get_my_usuario_id());

CREATE TABLE IF NOT EXISTS public.action_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accion_id uuid NOT NULL REFERENCES public.acciones_diarias(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_chat_id text,
  external_message_id text,
  delivery_status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT action_delivery_log_channel_chk CHECK (channel IN ('telegram')),
  CONSTRAINT action_delivery_log_status_chk CHECK (delivery_status IN ('queued', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_action_delivery_log_accion
  ON public.action_delivery_log(accion_id);
CREATE INDEX IF NOT EXISTS idx_action_delivery_log_usuario_channel
  ON public.action_delivery_log(usuario_id, channel);

ALTER TABLE public.action_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS action_delivery_log_select_own_or_admin ON public.action_delivery_log;
CREATE POLICY action_delivery_log_select_own_or_admin ON public.action_delivery_log
  FOR SELECT TO authenticated
  USING (
    usuario_id = public.get_my_usuario_id()
    OR public.is_app_admin()
    OR public.is_business_admin()
  );

CREATE TABLE IF NOT EXISTS public.external_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  external_update_id text,
  external_message_id text,
  external_user_id text,
  external_chat_id text,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion_id uuid REFERENCES public.acciones_diarias(id) ON DELETE SET NULL,
  checkpoint_id uuid REFERENCES public.accion_checkpoints(id) ON DELETE SET NULL,
  message_type text,
  payload jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_inbound_messages_channel_chk CHECK (channel IN ('telegram'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_external_inbound_messages_channel_update
  ON public.external_inbound_messages(channel, external_update_id)
  WHERE external_update_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_inbound_messages_usuario
  ON public.external_inbound_messages(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_inbound_messages_accion
  ON public.external_inbound_messages(accion_id, created_at DESC);

ALTER TABLE public.external_inbound_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_inbound_messages_select_own_or_admin ON public.external_inbound_messages;
CREATE POLICY external_inbound_messages_select_own_or_admin ON public.external_inbound_messages
  FOR SELECT TO authenticated
  USING (
    usuario_id = public.get_my_usuario_id()
    OR public.is_app_admin()
    OR public.is_business_admin()
  );

CREATE OR REPLACE FUNCTION public.link_telegram_identity(
  p_token text,
  p_external_user_id text,
  p_external_chat_id text,
  p_external_username text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_row public.telegram_link_tokens%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Funcion reservada para integraciones de servidor.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO token_row
  FROM public.telegram_link_tokens
  WHERE token = btrim(coalesce(p_token, ''))
  FOR UPDATE;

  IF token_row.token IS NULL THEN
    RAISE EXCEPTION 'Token de Telegram invalido.'
      USING ERRCODE = 'P0002';
  END IF;

  IF token_row.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Token de Telegram ya utilizado.'
      USING ERRCODE = '23514';
  END IF;

  IF token_row.expires_at < now() THEN
    RAISE EXCEPTION 'Token de Telegram expirado.'
      USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.user_channel_identities
  WHERE channel = 'telegram'
    AND usuario_id = token_row.usuario_id
    AND external_user_id <> p_external_user_id;

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
    token_row.usuario_id,
    'telegram',
    p_external_user_id,
    p_external_chat_id,
    p_external_username,
    p_display_name,
    'active',
    now(),
    now(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (channel, external_user_id) DO UPDATE
  SET
    usuario_id = EXCLUDED.usuario_id,
    external_chat_id = EXCLUDED.external_chat_id,
    external_username = EXCLUDED.external_username,
    display_name = EXCLUDED.display_name,
    status = 'active',
    verified_at = COALESCE(public.user_channel_identities.verified_at, now()),
    last_seen_at = now(),
    metadata = EXCLUDED.metadata,
    updated_at = now();

  UPDATE public.telegram_link_tokens
  SET used_at = now()
  WHERE token = token_row.token;

  RETURN jsonb_build_object(
    'ok', true,
    'usuario_id', token_row.usuario_id,
    'channel', 'telegram'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_telegram_identity(text, text, text, text, text, jsonb) TO service_role;

-- Data API grants for projects where public tables are not auto-exposed.
GRANT SELECT ON TABLE public.telegram_link_tokens TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.user_channel_identities TO authenticated;
GRANT SELECT ON TABLE public.action_delivery_log TO authenticated;
GRANT SELECT ON TABLE public.external_inbound_messages TO authenticated;
GRANT ALL ON TABLE public.telegram_link_tokens TO service_role;
GRANT ALL ON TABLE public.user_channel_identities TO service_role;
GRANT ALL ON TABLE public.action_delivery_log TO service_role;
GRANT ALL ON TABLE public.external_inbound_messages TO service_role;

NOTIFY pgrst, 'reload schema';
