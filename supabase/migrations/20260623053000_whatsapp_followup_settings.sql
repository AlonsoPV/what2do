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
