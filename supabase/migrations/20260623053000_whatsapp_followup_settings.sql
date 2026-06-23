CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select_authenticated ON public.app_settings;
CREATE POLICY app_settings_select_authenticated ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS app_settings_manage_admin ON public.app_settings;
CREATE POLICY app_settings_manage_admin ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_app_admin() OR public.is_business_admin())
  WITH CHECK (public.is_app_admin() OR public.is_business_admin());

GRANT SELECT, INSERT, UPDATE ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'whatsapp_followup',
  jsonb_build_object(
    'followup_delay_minutes', 5,
    'followups_per_day', 1
  ),
  'Configuracion de seguimientos automaticos por WhatsApp.'
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.whatsapp_result_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accion_id uuid NOT NULL REFERENCES public.acciones_diarias(id) ON DELETE CASCADE,
  checkpoint_id uuid REFERENCES public.accion_checkpoints(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  wa_id text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  last_received_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_result_requests_status_chk CHECK (status IN ('waiting', 'received', 'expired'))
);

DROP TRIGGER IF EXISTS set_whatsapp_result_requests_updated_at ON public.whatsapp_result_requests;
CREATE TRIGGER set_whatsapp_result_requests_updated_at
  BEFORE UPDATE ON public.whatsapp_result_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_whatsapp_result_requests_waiting
  ON public.whatsapp_result_requests(wa_id, expires_at DESC)
  WHERE status IN ('waiting', 'received');

CREATE INDEX IF NOT EXISTS idx_whatsapp_result_requests_accion
  ON public.whatsapp_result_requests(accion_id, created_at DESC);

ALTER TABLE public.whatsapp_result_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_result_requests_select_admin ON public.whatsapp_result_requests;
CREATE POLICY whatsapp_result_requests_select_admin ON public.whatsapp_result_requests
  FOR SELECT TO authenticated
  USING (
    usuario_id = public.get_my_usuario_id()
    OR public.is_app_admin()
    OR public.is_business_admin()
  );

GRANT SELECT ON TABLE public.whatsapp_result_requests TO authenticated;
GRANT ALL ON TABLE public.whatsapp_result_requests TO service_role;
