-- =============================================================================
-- handle_new_user: rol como text (catalog_roles), sin cast a user_role enum.
-- La migración 20260313260000 usaba ::user_role; si raw_user_meta_data.rol es
-- p. ej. "Externo" (no existe en el enum user_role), el trigger falla y NO se
-- inserta fila en public.usuarios → "No se pudo cargar tu perfil".
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre text;
  user_rol text;
  user_area text;
  user_activo boolean;
  user_onboarding_completed boolean;
BEGIN
  user_nombre := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
    split_part(NEW.email, '@', 1)
  );
  user_rol := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'rol'), ''),
    'Operaciones'
  );
  user_area := NULLIF(trim(NEW.raw_user_meta_data->>'area'), '');
  user_activo := COALESCE((NULLIF(trim(NEW.raw_user_meta_data->>'activo'), ''))::boolean, true);
  user_onboarding_completed := COALESCE(
    (NULLIF(trim(NEW.raw_user_meta_data->>'onboarding_completed'), ''))::boolean,
    false
  );

  INSERT INTO public.usuarios (user_id, nombre, rol, area, activo, onboarding_completed)
  VALUES (NEW.id, user_nombre, user_rol, user_area, user_activo, user_onboarding_completed);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
