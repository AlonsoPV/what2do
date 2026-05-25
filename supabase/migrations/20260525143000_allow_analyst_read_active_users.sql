-- =============================================================================
-- Rol Analista: permitir lectura de usuarios activos para asignar responsables.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_business_role(p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.user_id = auth.uid()
      AND lower(trim(u.rol::text)) = lower(trim(p_role))
      AND u.activo = true
  );
$$;

COMMENT ON FUNCTION public.has_business_role(text) IS
  'Indica si el usuario autenticado tiene un rol de negocio activo en public.usuarios.';

DROP POLICY IF EXISTS usuarios_select_active_for_analyst ON public.usuarios;

CREATE POLICY usuarios_select_active_for_analyst ON public.usuarios
  FOR SELECT
  USING (
    activo = true
    AND public.has_business_role('Analista')
  );
