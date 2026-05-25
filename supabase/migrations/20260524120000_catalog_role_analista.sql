-- =============================================================================
-- Rol Analista: acceso consultivo a modulos definidos.
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Analista';

INSERT INTO public.catalog_roles (nombre, descripcion, activo)
SELECT
  'Analista',
  'Rol consultivo con acceso a kanban, academia, disciplina, calendario, notificaciones, manual y mi perfil.',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalog_roles
  WHERE lower(trim(nombre)) = lower('Analista')
);
