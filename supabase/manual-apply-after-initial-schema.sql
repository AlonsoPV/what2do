-- =============================================================================
-- Migraciones POST initial_schema (desde add_super_admin_role en adelante).
-- Usar cuando YA aplicaste 20260313120000_initial_schema.sql (o equivalente)
-- y ves error "type user_role already exists" al correr el consolidado completo.
-- =============================================================================
-- >>> FILE: 20260313130000_add_super_admin_role.sql
-- =============================================================================
-- Rol Super Admin
-- Añade app_role 'super_admin' con privilegios máximos y función para asignarlo.
-- =============================================================================

-- Añadir valor al enum (PostgreSQL 10+)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- -----------------------------------------------------------------------------
-- Helper: es admin (admin o super_admin)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.app_role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- Helper: es super_admin (solo super_admin)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.app_role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- Políticas user_roles: solo super_admin puede insertar/actualizar/eliminar
-- (asignar o revocar roles). Cualquier usuario puede leer su propio rol.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS user_roles_select_own_or_admin ON user_roles;

CREATE POLICY user_roles_select_own_or_admin ON user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_app_admin());

-- Solo super_admin puede gestionar roles (crear, actualizar, borrar)
CREATE POLICY user_roles_insert_super_admin ON user_roles
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY user_roles_update_super_admin ON user_roles
  FOR UPDATE USING (is_super_admin());

CREATE POLICY user_roles_delete_super_admin ON user_roles
  FOR DELETE USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- Función: asignar primer super_admin (solo ejecución con service_role / SQL)
-- Uso desde Dashboard SQL o Edge Function con service_role:
--   SELECT set_first_super_admin('uuid-del-auth-user');
--   SELECT set_first_super_admin_by_email('admin@empresa.com');
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_first_super_admin(p_user_id uuid)
RETURNS void AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id no puede ser null';
  END IF;
  INSERT INTO user_roles (user_id, app_role)
  VALUES (p_user_id, 'super_admin')
  ON CONFLICT (user_id) DO UPDATE SET app_role = 'super_admin', updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_first_super_admin(uuid) IS
  'Asigna rol super_admin a un usuario. Ejecutar con service_role o desde SQL Editor.';

-- Por email (busca auth.users vía tabla usuarios)
CREATE OR REPLACE FUNCTION set_first_super_admin_by_email(p_email text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'email no puede ser vacío';
  END IF;
  SELECT u.user_id INTO v_user_id
  FROM usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE au.email = trim(lower(p_email))
  LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró usuario con email %', p_email;
  END IF;
  PERFORM set_first_super_admin(v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_first_super_admin_by_email(text) IS
  'Asigna rol super_admin al usuario con el email dado. Ejecutar con service_role o desde SQL Editor.';


-- >>> FILE: 20260313140000_catalog_tables.sql
-- =============================================================================
-- Tablas de catálogos / configuración (admin)
-- roles, areas, statuses, priorities, dropdown_catalogs, dropdown_options, catalog_kpis
-- =============================================================================

-- catalog_roles: roles visibles del sistema (preparado para permisos por rol)
CREATE TABLE catalog_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_catalog_roles_nombre_length CHECK (char_length(trim(nombre)) >= 2)
);

CREATE INDEX idx_catalog_roles_activo ON catalog_roles(activo);

-- areas: departamentos/áreas para usuarios, filtros y reportes
CREATE TABLE areas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_areas_nombre_length CHECK (char_length(trim(nombre)) >= 2)
);

CREATE UNIQUE INDEX idx_areas_nombre_unique ON areas(lower(trim(nombre)));
CREATE INDEX idx_areas_activo ON areas(activo);

-- statuses: estatus operativos (orden, color, es_cierre)
CREATE TABLE statuses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  color text,
  orden int NOT NULL DEFAULT 0,
  es_cierre boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_statuses_nombre_length CHECK (char_length(trim(nombre)) >= 2)
);

CREATE INDEX idx_statuses_orden ON statuses(orden);
CREATE INDEX idx_statuses_activo ON statuses(activo);

-- priorities: prioridades
CREATE TABLE priorities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_priorities_nombre_length CHECK (char_length(trim(nombre)) >= 2)
);

CREATE INDEX idx_priorities_orden ON priorities(orden);
CREATE INDEX idx_priorities_activo ON priorities(activo);

-- dropdown_catalogs: tipos de listas desplegables
CREATE TABLE dropdown_catalogs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_dropdown_catalogs_key_length CHECK (char_length(trim(key)) >= 1),
  CONSTRAINT chk_dropdown_catalogs_nombre_length CHECK (char_length(trim(nombre)) >= 2)
);

CREATE UNIQUE INDEX idx_dropdown_catalogs_key ON dropdown_catalogs(lower(trim(key)));
CREATE INDEX idx_dropdown_catalogs_activo ON dropdown_catalogs(activo);

-- dropdown_options: opciones de cada catálogo desplegable
CREATE TABLE dropdown_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id uuid NOT NULL REFERENCES dropdown_catalogs(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_dropdown_options_label_length CHECK (char_length(trim(label)) >= 1),
  CONSTRAINT chk_dropdown_options_value_length CHECK (char_length(trim(value)) >= 1)
);

CREATE INDEX idx_dropdown_options_catalog ON dropdown_options(catalog_id);
CREATE INDEX idx_dropdown_options_orden ON dropdown_options(catalog_id, orden);
CREATE UNIQUE INDEX idx_dropdown_options_catalog_value ON dropdown_options(catalog_id, lower(trim(value)));

-- catalog_kpis: KPIs configurables (nombre, unidad, tipo, meta, periodicidad)
-- Separado de kpis existente (sagrados) para evolución y dashboards dinámicos
CREATE TABLE catalog_kpis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  unidad text NOT NULL DEFAULT 'porcentaje',
  tipo text NOT NULL DEFAULT 'manual',
  meta_objetivo numeric,
  periodicidad text NOT NULL DEFAULT 'mensual',
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_catalog_kpis_nombre_length CHECK (char_length(trim(nombre)) >= 2)
);

CREATE INDEX idx_catalog_kpis_activo ON catalog_kpis(activo);
CREATE INDEX idx_catalog_kpis_orden ON catalog_kpis(orden);

-- Triggers updated_at
CREATE TRIGGER set_catalog_roles_updated_at
  BEFORE UPDATE ON catalog_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_areas_updated_at
  BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_statuses_updated_at
  BEFORE UPDATE ON statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_priorities_updated_at
  BEFORE UPDATE ON priorities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_dropdown_catalogs_updated_at
  BEFORE UPDATE ON dropdown_catalogs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_dropdown_options_updated_at
  BEFORE UPDATE ON dropdown_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_catalog_kpis_updated_at
  BEFORE UPDATE ON catalog_kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE catalog_roles IS 'Catálogo de roles visibles; preparado para permisos por rol';
COMMENT ON TABLE areas IS 'Catálogo de áreas/departamentos para usuarios y reportes';
COMMENT ON TABLE statuses IS 'Estatus operativos con orden, color y es_cierre';
COMMENT ON TABLE catalog_kpis IS 'KPIs configurables; preparado para fórmulas y dashboards';


-- >>> FILE: 20260313150000_usuarios_rol_from_catalog.sql
-- =============================================================================
-- Conectar usuarios.rol y usuarios.area con catálogos
-- rol: de enum user_role a text (se guarda nombre de catalog_roles)
-- area: ya es text (se guarda nombre de areas); sin cambio de esquema
-- =============================================================================

-- 1. Cambiar columna rol a text (conservar valores actuales)
ALTER TABLE usuarios
  ALTER COLUMN rol TYPE text USING rol::text;

-- Mantener default para nuevos registros sin rol
ALTER TABLE usuarios
  ALTER COLUMN rol SET DEFAULT 'Operaciones';

-- 2. Trigger handle_new_user: usar text para rol
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre text;
  user_rol text;
BEGIN
  user_nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));
  user_rol := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'rol'), ''),
    'Operaciones'
  );
  INSERT INTO public.usuarios (user_id, nombre, rol)
  VALUES (NEW.id, user_nombre, user_rol);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN usuarios.rol IS 'Nombre del rol; debe coincidir con catalog_roles.nombre (catálogo conectado)';
COMMENT ON COLUMN usuarios.area IS 'Nombre del área; debe coincidir con areas.nombre (catálogo conectado)';


-- >>> FILE: 20260313160000_seed_evidencia_esperada_catalog.sql
-- Catálogo "evidencia_esperada" para el formulario de acciones (correo, llamada, documento, etc.)
INSERT INTO dropdown_catalogs (key, nombre, descripcion, activo)
SELECT 'evidencia_esperada', 'Evidencia esperada', 'Tipo de evidencia a entregar en acciones diarias', true
WHERE NOT EXISTS (SELECT 1 FROM dropdown_catalogs WHERE trim(lower(key)) = 'evidencia_esperada');

INSERT INTO dropdown_options (catalog_id, label, value, orden, activo)
SELECT c.id, v.label, v.value, v.orden, true
FROM dropdown_catalogs c
CROSS JOIN (VALUES
  ('Correo', 'correo', 1),
  ('Llamada', 'llamada', 2),
  ('Documento', 'documento', 3),
  ('Reunión', 'reunion', 4),
  ('Screenshot / captura', 'screenshot', 5),
  ('Otro especificar', 'otro', 6)
) AS v(label, value, orden)
WHERE c.key = 'evidencia_esperada'
  AND NOT EXISTS (
    SELECT 1 FROM dropdown_options o
    WHERE o.catalog_id = c.id AND lower(trim(o.value)) = v.value
  );


-- >>> FILE: 20260313170000_sync_usuario_from_auth.sql
-- =============================================================================
-- Sincronizar perfil en usuarios para un user_id creado solo en auth.users
-- Si creas un usuario en Supabase Auth (Authentication) pero no aparece en
-- "Administración de usuarios" del tablero, es porque falta la fila en public.usuarios.
-- Este script inserta el perfil para el user_id indicado (si no existe).
-- =============================================================================

-- Usuario creado directo en Supabase Auth: dd764c9f-8145-45d4-9111-0a8ec7f687e5
-- Inserta perfil en public.usuarios solo si existe en auth.users y aún no está en usuarios.
INSERT INTO public.usuarios (user_id, nombre, rol, activo)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'nombre'), ''),
    split_part(u.email, '@', 1),
    'Usuario añadido'
  ),
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'rol'), ''),
    'Operaciones'
  ),
  true
FROM auth.users u
WHERE u.id = 'dd764c9f-8145-45d4-9111-0a8ec7f687e5'
  AND NOT EXISTS (SELECT 1 FROM public.usuarios WHERE user_id = u.id);


-- >>> FILE: 20260313180000_usuarios_insert_update_admin.sql
-- =============================================================================
-- Permitir a admins INSERT y UPDATE en public.usuarios
-- Sin esto, desde el cliente no se puede añadir perfil (INSERT) ni editar otros (UPDATE).
-- =============================================================================

-- Admins pueden insertar perfiles (vincular auth.users existente a public.usuarios)
CREATE POLICY usuarios_insert_admin ON public.usuarios
  FOR INSERT
  WITH CHECK (is_app_admin());

-- Admins pueden actualizar cualquier perfil; usuario normal solo el propio
DROP POLICY IF EXISTS usuarios_update_own ON public.usuarios;
CREATE POLICY usuarios_update_own_or_admin ON public.usuarios
  FOR UPDATE
  USING (user_id = auth.uid() OR is_app_admin());


-- >>> FILE: 20260313190000_assign_super_admin_initial_user.sql
-- (Ajuste) Solo inserta super_admin si el usuario existe en auth.users
INSERT INTO user_roles (user_id, app_role)
SELECT '83a033bd-e273-4314-8c9a-6a6bd8f4400e'::uuid, 'super_admin'::app_role
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '83a033bd-e273-4314-8c9a-6a6bd8f4400e'::uuid)
ON CONFLICT (user_id) DO UPDATE SET app_role = 'super_admin', updated_at = now();


-- >>> FILE: 20260313200000_acciones_visible_para_todos.sql
-- =============================================================================
-- Acciones visibles para todos los usuarios autenticados.
-- Antes: solo responsable o admin. Ahora: cualquier usuario autenticado.
-- =============================================================================

DROP POLICY IF EXISTS acciones_select_own_or_admin ON acciones_diarias;
DROP POLICY IF EXISTS acciones_select_authenticated ON acciones_diarias;
CREATE POLICY acciones_select_authenticated ON acciones_diarias
  FOR SELECT USING (auth.role() = 'authenticated');

-- accion_evidencias: si todos ven todas las acciones, todos ven sus evidencias
DROP POLICY IF EXISTS accion_evidencias_select ON accion_evidencias;
DROP POLICY IF EXISTS accion_evidencias_select_authenticated ON accion_evidencias;
CREATE POLICY accion_evidencias_select_authenticated ON accion_evidencias
  FOR SELECT USING (auth.role() = 'authenticated');


-- >>> FILE: 20260313210000_action_status_retraso.sql
-- =============================================================================
-- Añadir estado Retraso: acción vencida (fecha límite pasada) sin completar.
-- =============================================================================

ALTER TYPE action_status ADD VALUE IF NOT EXISTS 'Retraso';


-- >>> FILE: 20260313220000_accion_comentarios.sql
-- =============================================================================
-- Comentarios en acciones: contenido, responsable asignado, etiquetas.
-- created_at automático (default now()).
-- =============================================================================

CREATE TABLE accion_comentarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  asignado uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  etiquetas text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_accion_comentarios_accion_id ON accion_comentarios(accion_id);
CREATE INDEX idx_accion_comentarios_created_at ON accion_comentarios(created_at);

ALTER TABLE accion_comentarios ENABLE ROW LEVEL SECURITY;

-- Visible si la acción es visible (todos los autenticados tras 20260313200000)
CREATE POLICY accion_comentarios_select_authenticated ON accion_comentarios
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_comentarios_insert_authenticated ON accion_comentarios
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY accion_comentarios_update_authenticated ON accion_comentarios
  FOR UPDATE USING (auth.role() = 'authenticated');


-- >>> FILE: 20260313230000_notificaciones_insert.sql
-- =============================================================================
-- Permitir INSERT en notificaciones para que el cliente cree notificaciones
-- (comentarios, asignaciones, etc.).
-- =============================================================================

DROP POLICY IF EXISTS notificaciones_insert_authenticated ON notificaciones;
CREATE POLICY notificaciones_insert_authenticated ON notificaciones
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- >>> FILE: 20260313235000_notificaciones_realtime.sql
-- Habilitar Realtime para notificaciones (postgres_changes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
  END IF;
END $$;


-- >>> FILE: 20260313240000_acciones_created_by_updated_by.sql
-- Añade created_by y updated_by a acciones_diarias.
-- Modelo: quién creó, a quién está asignado (responsable), quién modificó.
-- RLS puede usar estos campos para restricciones por rol.

ALTER TABLE acciones_diarias
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_created_by ON acciones_diarias(created_by);
CREATE INDEX IF NOT EXISTS idx_acciones_diarias_updated_by ON acciones_diarias(updated_by);

COMMENT ON COLUMN acciones_diarias.created_by IS 'Usuario que creó la acción (usuarios.id)';
COMMENT ON COLUMN acciones_diarias.updated_by IS 'Usuario que realizó la última modificación';


-- >>> FILE: 20260313240500_evidencias_storage_comentarios_adjuntos.sql
-- =============================================================================
-- 1) Adjuntos en comentarios (PDF, PNG, JPG): paths en JSONB
-- 2) Bucket de storage para evidencias (crear si no existe)
-- =============================================================================

-- Adjuntos en comentarios: array de { storage_path, file_name }
ALTER TABLE accion_comentarios
  ADD COLUMN IF NOT EXISTS adjuntos jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN accion_comentarios.adjuntos IS 'Array de { storage_path, file_name } para archivos adjuntos (PDF, PNG, JPG)';

-- Bucket para evidencias (acciones y comentarios)
-- Si falla por permisos, crear el bucket desde el Dashboard y ejecutar solo las políticas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidencias',
  'evidencias',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- Políticas: autenticados pueden subir y leer
DROP POLICY IF EXISTS evidencias_insert ON storage.objects;
CREATE POLICY evidencias_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidencias');

DROP POLICY IF EXISTS evidencias_select ON storage.objects;
CREATE POLICY evidencias_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidencias');

DROP POLICY IF EXISTS evidencias_delete ON storage.objects;
CREATE POLICY evidencias_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evidencias');


-- >>> FILE: 20260313250000_get_auth_user_email.sql
-- Función para obtener el email de auth.users.
-- Solo el propio usuario o admins pueden consultar.

CREATE OR REPLACE FUNCTION get_auth_user_email(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  -- Solo el propio usuario o admins pueden ver el email
  IF auth.uid() != p_user_id AND NOT is_app_admin() THEN
    RETURN NULL;
  END IF;
  SELECT au.email INTO v_email
  FROM auth.users au
  WHERE au.id = p_user_id
  LIMIT 1;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = '';

COMMENT ON FUNCTION get_auth_user_email(uuid) IS
  'Devuelve el email de auth.users para user_id. Solo propio usuario o admins.';


-- >>> FILE: 20260313260000_handle_new_user_area.sql
-- =============================================================================
-- Sincronizar perfil al invitar usuarios por correo
-- El trigger de auth.users debe conservar el área enviada en raw_user_meta_data
-- para que la invitación cree el perfil completo sin depender de user_id manual.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_nombre text;
  user_rol user_role;
  user_area text;
  user_activo boolean;
  user_onboarding_completed boolean;
BEGIN
  user_nombre := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
    split_part(NEW.email, '@', 1)
  );
  user_rol := COALESCE(
    (NULLIF(trim(NEW.raw_user_meta_data->>'rol'), ''))::user_role,
    'Operaciones'::user_role
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


-- >>> FILE: 20260313270000_notificaciones_insert_policy.sql
-- Asegurar que cualquier usuario autenticado pueda crear notificaciones para otros
-- (ej. al asignar responsable en una acción). Sin esta política, INSERT devuelve 403.
DROP POLICY IF EXISTS notificaciones_insert_authenticated ON notificaciones;
CREATE POLICY notificaciones_insert_authenticated ON notificaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);


-- >>> FILE: 20260313280000_acciones_titulo_accion.sql
-- Título de la acción (máx. 70 caracteres). Se muestra cuando la acción está colapsada.
ALTER TABLE acciones_diarias
  ADD COLUMN IF NOT EXISTS titulo_accion text NOT NULL DEFAULT '';

ALTER TABLE acciones_diarias
  DROP CONSTRAINT IF EXISTS chk_titulo_accion_length;

ALTER TABLE acciones_diarias
  ADD CONSTRAINT chk_titulo_accion_length CHECK (char_length(titulo_accion) <= 70);

COMMENT ON COLUMN acciones_diarias.titulo_accion IS 'Título breve de la acción (máx. 70 caracteres); se muestra en vista colapsada.';


-- >>> FILE: 20260313290000_catalog_evidencia_otro_especificar.sql
-- Actualizar la opción "Otro" del catálogo evidencia_esperada a "Otro especificar".
UPDATE dropdown_options o
SET label = 'Otro especificar', updated_at = now()
FROM dropdown_catalogs c
WHERE o.catalog_id = c.id
  AND trim(lower(c.key)) = 'evidencia_esperada'
  AND (trim(lower(o.value)) = 'otro' OR trim(lower(o.label)) = 'otro');


-- >>> FILE: 20260313300000_distance_queries.sql
-- Tabla para guardar consultas de distancia (Google Routes API).
-- RLS: cada usuario ve/inserta solo sus propias filas (created_by → usuarios.id).

CREATE TABLE IF NOT EXISTS distance_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen_nombre text NOT NULL,
  origen_ubicacion text NOT NULL,
  destino_nombre text NOT NULL,
  destino_ubicacion text NOT NULL,
  distancia_km numeric NOT NULL,
  google_distance_meters integer,
  route_mode text NOT NULL DEFAULT 'DRIVE',
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distance_queries_created_by ON distance_queries(created_by);
CREATE INDEX IF NOT EXISTS idx_distance_queries_created_at ON distance_queries(created_at DESC);

COMMENT ON TABLE distance_queries IS 'Historial de consultas de distancia (Routes API)';
COMMENT ON COLUMN distance_queries.route_mode IS 'Modo de viaje: DRIVE, WALK, etc.';
COMMENT ON COLUMN distance_queries.status IS 'ok | error';
COMMENT ON COLUMN distance_queries.error_message IS 'Mensaje de error si status = error';

ALTER TABLE distance_queries ENABLE ROW LEVEL SECURITY;

-- Ver solo propias consultas; insertar con created_by = propio usuario.
CREATE POLICY distance_queries_select_own ON distance_queries
  FOR SELECT
  USING (created_by = get_my_usuario_id());

CREATE POLICY distance_queries_insert_own ON distance_queries
  FOR INSERT
  WITH CHECK (created_by = get_my_usuario_id());


-- >>> FILE: 20260313310000_distance_queries_duracion_cache.sql
-- 1) Tabla distance_queries más completa: metros y duración para reportes y lógica operativa.
-- 2) Caché simple para reutilizar resultados y ahorrar consumo de API.

-- Añadir duración en segundos (Google Routes devuelve duration; útil para reportes).
ALTER TABLE distance_queries
  ADD COLUMN IF NOT EXISTS duracion_segundos integer;

-- Renombrar columna de metros para consistencia con la tabla sugerida (solo si existe aún).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'distance_queries' AND column_name = 'google_distance_meters'
  ) THEN
    ALTER TABLE distance_queries RENAME COLUMN google_distance_meters TO distancia_metros;
  END IF;
END $$;

COMMENT ON COLUMN distance_queries.duracion_segundos IS 'Duración estimada de la ruta en segundos (Google Routes)';
COMMENT ON COLUMN distance_queries.distancia_metros IS 'Distancia en metros (mismo valor que distancia_km * 1000)';

-- Tabla de caché: misma ruta (origen, destino, modo) reutilizable por un tiempo.
-- Solo la Edge Function (service role) lee/escribe; no exponer al cliente.
CREATE TABLE IF NOT EXISTS distance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen_ubicacion text NOT NULL,
  destino_ubicacion text NOT NULL,
  route_mode text NOT NULL DEFAULT 'DRIVE',
  distancia_km numeric NOT NULL,
  distancia_metros integer NOT NULL,
  duracion_segundos integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distance_cache_lookup ON distance_cache (
  trim(lower(origen_ubicacion)),
  trim(lower(destino_ubicacion)),
  route_mode
);
CREATE INDEX IF NOT EXISTS idx_distance_cache_created_at ON distance_cache(created_at DESC);

COMMENT ON TABLE distance_cache IS 'Caché de consultas Routes API; TTL implícito por created_at (ej. 24 h en la Edge Function)';


-- >>> FILE: 20260313320000_distance_catalogs_and_requests.sql
-- =============================================================================
-- Módulo distancias reestructurado: catálogos de orígenes, destinos, distancias
-- calculadas y tablero de solicitudes. No elimina distance_queries ni distance_cache.
-- =============================================================================

-- distance_origins: catálogo de orígenes para rutas
CREATE TABLE IF NOT EXISTS distance_origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ubicacion text NOT NULL,
  latitud numeric,
  longitud numeric,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_distance_origins_nombre CHECK (char_length(trim(nombre)) >= 1),
  CONSTRAINT chk_distance_origins_ubicacion CHECK (char_length(trim(ubicacion)) >= 1)
);

CREATE INDEX idx_distance_origins_activo ON distance_origins(activo);

-- distance_destinations: catálogo de destinos para rutas
CREATE TABLE IF NOT EXISTS distance_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ubicacion text NOT NULL,
  latitud numeric,
  longitud numeric,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_distance_destinations_nombre CHECK (char_length(trim(nombre)) >= 1),
  CONSTRAINT chk_distance_destinations_ubicacion CHECK (char_length(trim(ubicacion)) >= 1)
);

CREATE INDEX idx_distance_destinations_activo ON distance_destinations(activo);

-- distance_catalog: caché maestro de rutas calculadas (origen_id, destino_id) → km_ida, km_vuelta, km_total
CREATE TABLE IF NOT EXISTS distance_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_id uuid NOT NULL REFERENCES distance_origins(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES distance_destinations(id) ON DELETE CASCADE,
  origen_nombre_snapshot text,
  destino_nombre_snapshot text,
  origen_ubicacion_snapshot text,
  destino_ubicacion_snapshot text,
  km_ida numeric NOT NULL,
  km_vuelta numeric NOT NULL,
  km_total numeric NOT NULL,
  meters_ida integer,
  meters_vuelta integer,
  duracion_ida_segundos integer,
  duracion_vuelta_segundos integer,
  route_mode text NOT NULL DEFAULT 'DRIVE',
  api_source text NOT NULL DEFAULT 'google_routes',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_distance_catalog_origin_dest_mode UNIQUE (origin_id, destination_id, route_mode)
);

CREATE INDEX idx_distance_catalog_origin_dest ON distance_catalog(origin_id, destination_id);
CREATE INDEX idx_distance_catalog_activo ON distance_catalog(activo);

-- distance_requests: solicitudes del tablero (cada consulta guardada por el usuario)
CREATE TABLE IF NOT EXISTS distance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta text,
  fecha date NOT NULL,
  hora_alta time NOT NULL,
  origin_id uuid NOT NULL REFERENCES distance_origins(id) ON DELETE RESTRICT,
  destination_id uuid NOT NULL REFERENCES distance_destinations(id) ON DELETE RESTRICT,
  distance_catalog_id uuid REFERENCES distance_catalog(id) ON DELETE SET NULL,
  km_ida numeric,
  km_vuelta numeric,
  km_total numeric,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_distance_requests_created_by ON distance_requests(created_by);
CREATE INDEX idx_distance_requests_created_at ON distance_requests(created_at DESC);
CREATE INDEX idx_distance_requests_fecha ON distance_requests(fecha DESC);

-- Triggers updated_at
CREATE TRIGGER set_distance_origins_updated_at
  BEFORE UPDATE ON distance_origins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_distance_destinations_updated_at
  BEFORE UPDATE ON distance_destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_distance_catalog_updated_at
  BEFORE UPDATE ON distance_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_distance_requests_updated_at
  BEFORE UPDATE ON distance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE distance_origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_requests ENABLE ROW LEVEL SECURITY;

-- Orígenes y destinos: usuarios autenticados pueden leer; admins pueden escribir (alineado con catálogos)
CREATE POLICY distance_origins_select ON distance_origins FOR SELECT USING (true);
CREATE POLICY distance_origins_insert ON distance_origins FOR INSERT WITH CHECK (is_app_admin());
CREATE POLICY distance_origins_update ON distance_origins FOR UPDATE USING (is_app_admin());

CREATE POLICY distance_destinations_select ON distance_destinations FOR SELECT USING (true);
CREATE POLICY distance_destinations_insert ON distance_destinations FOR INSERT WITH CHECK (is_app_admin());
CREATE POLICY distance_destinations_update ON distance_destinations FOR UPDATE USING (is_app_admin());

-- Catálogo de distancias: todos pueden leer (para dropdown/preview); insert/update solo vía Edge Function (service role)
CREATE POLICY distance_catalog_select ON distance_catalog FOR SELECT USING (true);

-- Solicitudes: cada usuario ve/inserta las propias
CREATE POLICY distance_requests_select_own ON distance_requests
  FOR SELECT USING (created_by = get_my_usuario_id());

CREATE POLICY distance_requests_insert_own ON distance_requests
  FOR INSERT WITH CHECK (created_by = get_my_usuario_id());

CREATE POLICY distance_requests_update_own ON distance_requests
  FOR UPDATE USING (created_by = get_my_usuario_id());

COMMENT ON TABLE distance_origins IS 'Catálogo de orígenes para cálculo de rutas; lat/long opcional para geocoding futuro';
COMMENT ON TABLE distance_destinations IS 'Catálogo de destinos para cálculo de rutas; lat/long opcional para geocoding futuro';
COMMENT ON TABLE distance_catalog IS 'Caché de distancias calculadas por par origen-destino; evita llamadas repetidas a Google';
COMMENT ON TABLE distance_requests IS 'Solicitudes del tablero de distancias; cada registro es una consulta guardada por el usuario';


-- >>> FILE: 20260313320001_seed_distance_origins_destinations.sql
-- =============================================================================
-- Seed: orígenes y destinos de ejemplo para el módulo de distancias
-- latitud/longitud NULL; en fase posterior se pueden rellenar por geocoding
-- =============================================================================

INSERT INTO distance_origins (nombre, ubicacion, latitud, longitud, activo)
VALUES
  ('DHL Macrocentro', 'Macrocentro, Ciudad de México', NULL, NULL, true),
  ('Palmar', 'Palmar, ubicación principal', NULL, NULL, true),
  ('Medix', 'Medix, sede central', NULL, NULL, true);

INSERT INTO distance_destinations (nombre, ubicacion, latitud, longitud, activo)
VALUES
  ('DHL Macrocentro', 'Macrocentro, Ciudad de México', NULL, NULL, true),
  ('Palmar', 'Palmar, ubicación principal', NULL, NULL, true),
  ('Medix', 'Medix, sede central', NULL, NULL, true);


-- >>> FILE: 20260313320002_distance_requests_duracion.sql
-- Duración ida/vuelta en solicitudes para mostrar "aprox" en la tabla
ALTER TABLE distance_requests
  ADD COLUMN IF NOT EXISTS duracion_ida_segundos integer,
  ADD COLUMN IF NOT EXISTS duracion_vuelta_segundos integer;

COMMENT ON COLUMN distance_requests.duracion_ida_segundos IS 'Duración ida en segundos (desde catálogo/Google)';
COMMENT ON COLUMN distance_requests.duracion_vuelta_segundos IS 'Duración vuelta en segundos (desde catálogo/Google)';


-- >>> FILE: 20260313320003_saved_route_requests.sql
-- =============================================================================
-- saved_route_requests: catálogo de rutas guardadas (una fila por dirección).
-- Cada "guardado" del usuario genera dos filas: origen→destino y destino→origen.
-- La consulta siempre es por dirección exacta (A→B distinto de B→A).
-- =============================================================================

CREATE TABLE saved_route_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_id uuid NOT NULL REFERENCES distance_origins(id) ON DELETE RESTRICT,
  destination_id uuid NOT NULL REFERENCES distance_destinations(id) ON DELETE RESTRICT,
  origin_name_snapshot text,
  origin_location_snapshot text,
  destination_name_snapshot text,
  destination_location_snapshot text,
  distance_km numeric NOT NULL,
  distance_meters numeric,
  duration_seconds integer,
  route_mode text NOT NULL DEFAULT 'DRIVE',
  api_source text NOT NULL DEFAULT 'google_routes',
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_saved_route_requests_origin_dest_mode UNIQUE (origin_id, destination_id, route_mode)
);

CREATE INDEX idx_saved_route_requests_origin_dest ON saved_route_requests(origin_id, destination_id);
CREATE INDEX idx_saved_route_requests_route_mode ON saved_route_requests(route_mode);
CREATE INDEX idx_saved_route_requests_activo ON saved_route_requests(activo);
CREATE INDEX idx_saved_route_requests_created_at ON saved_route_requests(created_at DESC);

CREATE TRIGGER set_saved_route_requests_updated_at
  BEFORE UPDATE ON saved_route_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: todos los autenticados pueden leer (reutilizar rutas guardadas); insert/update solo propio
ALTER TABLE saved_route_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_route_requests_select_authenticated ON saved_route_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY saved_route_requests_insert_own ON saved_route_requests
  FOR INSERT WITH CHECK (created_by = get_my_usuario_id());

CREATE POLICY saved_route_requests_update_own ON saved_route_requests
  FOR UPDATE USING (created_by = get_my_usuario_id());

COMMENT ON TABLE saved_route_requests IS 'Rutas guardadas por dirección (una fila por origin_id→destination_id). Cada guardado crea dos filas: A→B y B→A. Lookup por dirección exacta.';


-- >>> FILE: 20260313320004_saved_route_requests_places_fk.sql
-- =============================================================================
-- Permitir guardar ambas direcciones (A→B y B→A): origin_id y destination_id
-- deben poder ser IDs de orígenes o de destinos. Se crea distance_places con
-- la unión de ambos catálogos y saved_route_requests referencia a places.
-- =============================================================================

-- Tabla que contiene todos los lugares (orígenes y destinos) para FKs de saved_route_requests
CREATE TABLE IF NOT EXISTS distance_places (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  ubicacion text NOT NULL,
  latitud numeric,
  longitud numeric,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_distance_places_nombre CHECK (char_length(trim(nombre)) >= 1),
  CONSTRAINT chk_distance_places_ubicacion CHECK (char_length(trim(ubicacion)) >= 1)
);

-- Poblar con todos los orígenes y destinos (sin duplicar id)
INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
SELECT id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at
  FROM distance_origins
ON CONFLICT (id) DO NOTHING;

INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
SELECT id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at
  FROM distance_destinations
ON CONFLICT (id) DO NOTHING;

-- Quitar FKs antiguas de saved_route_requests y apuntar a distance_places
ALTER TABLE saved_route_requests
  DROP CONSTRAINT IF EXISTS saved_route_requests_origin_id_fkey,
  DROP CONSTRAINT IF EXISTS saved_route_requests_destination_id_fkey;

ALTER TABLE saved_route_requests
  ADD CONSTRAINT saved_route_requests_origin_id_fkey
    FOREIGN KEY (origin_id) REFERENCES distance_places(id) ON DELETE RESTRICT,
  ADD CONSTRAINT saved_route_requests_destination_id_fkey
    FOREIGN KEY (destination_id) REFERENCES distance_places(id) ON DELETE RESTRICT;

COMMENT ON TABLE distance_places IS 'Unión de orígenes y destinos para que saved_route_requests pueda guardar ambas direcciones (A→B y B→A).';

-- Mantener distance_places sincronizada al insertar/actualizar orígenes o destinos
CREATE OR REPLACE FUNCTION sync_distance_places_from_origin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
  VALUES (NEW.id, NEW.nombre, NEW.ubicacion, NEW.latitud, NEW.longitud, NEW.activo, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    ubicacion = EXCLUDED.ubicacion,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    activo = EXCLUDED.activo,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_distance_places_from_destination()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO distance_places (id, nombre, ubicacion, latitud, longitud, activo, created_at, updated_at)
  VALUES (NEW.id, NEW.nombre, NEW.ubicacion, NEW.latitud, NEW.longitud, NEW.activo, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    ubicacion = EXCLUDED.ubicacion,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    activo = EXCLUDED.activo,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_places_after_origin_insert_update
  AFTER INSERT OR UPDATE ON distance_origins
  FOR EACH ROW EXECUTE FUNCTION sync_distance_places_from_origin();

CREATE TRIGGER sync_places_after_destination_insert_update
  AFTER INSERT OR UPDATE ON distance_destinations
  FOR EACH ROW EXECUTE FUNCTION sync_distance_places_from_destination();


-- >>> FILE: 20260313350000_handle_new_user_rol_text.sql
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


-- >>> FILE: 20260313400000_accion_checkpoints.sql
-- =============================================================================
-- Checkpoints / puntos a validar por acción (acciones_diarias).
-- Regla: no pasar a estado Hecho si existe algún checkpoint activo sin completar.
-- =============================================================================

CREATE TABLE accion_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  texto text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  obligatorio boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  completado boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  checked_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accion_checkpoints_texto_len CHECK (
    char_length(trim(texto)) >= 1 AND char_length(texto) <= 400
  )
);

CREATE INDEX idx_accion_checkpoints_accion_id ON accion_checkpoints(accion_id);
CREATE INDEX idx_accion_checkpoints_accion_activo ON accion_checkpoints(accion_id) WHERE activo = true;

CREATE TRIGGER set_accion_checkpoints_updated_at
  BEFORE UPDATE ON accion_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE accion_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY accion_checkpoints_select_authenticated ON accion_checkpoints
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_checkpoints_insert_responsable_or_admin ON accion_checkpoints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_checkpoints.accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

CREATE POLICY accion_checkpoints_update_responsable_or_admin ON accion_checkpoints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_checkpoints.accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

CREATE POLICY accion_checkpoints_delete_responsable_or_admin ON accion_checkpoints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_checkpoints.accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

-- Impide Hecho mientras haya checkpoints activos pendientes (independiente del cliente).
CREATE OR REPLACE FUNCTION acciones_prevent_hecho_if_checkpoints_pending()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Hecho'::action_status
     AND (OLD.estado IS DISTINCT FROM NEW.estado)
  THEN
    IF EXISTS (
      SELECT 1 FROM accion_checkpoints c
      WHERE c.accion_id = NEW.id
        AND c.activo = true
        AND c.completado = false
    ) THEN
      RAISE EXCEPTION 'No puedes marcar esta acción como Hecha porque aún existen puntos de validación pendientes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER acciones_diarias_block_hecho_checkpoints
  BEFORE UPDATE OF estado ON acciones_diarias
  FOR EACH ROW EXECUTE FUNCTION acciones_prevent_hecho_if_checkpoints_pending();

COMMENT ON TABLE accion_checkpoints IS 'Puntos a validar antes de cerrar la acción; activo=false para bajas lógicas futuras.';
COMMENT ON COLUMN accion_checkpoints.checked_by IS 'usuarios.id quien marcó completado (V1 opcional en UI).';
COMMENT ON COLUMN accion_checkpoints.obligatorio IS 'Reservado para reglas futuras; hoy todos los activos bloquean Hecho si pendientes.';


-- >>> FILE: 20260313500000_gaps_o2c_kpis.sql
-- =============================================================================
-- Gaps O2C + KPIs ponderados (catalog_kpis extendido, mediciones, snapshots, log)
-- No sustituye kpis/kpi_mediciones legacy; convive con catalog_kpis existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

CREATE TYPE gap_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE catalog_kpi_direction AS ENUM (
  'maximize',
  'minimize'
);

-- -----------------------------------------------------------------------------
-- gaps
-- -----------------------------------------------------------------------------

CREATE TABLE gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  prioridad text,
  status gap_status NOT NULL DEFAULT 'open',
  area text,
  owner_usuario uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  total_story_points numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_gaps_nombre_length CHECK (char_length(trim(nombre)) >= 2),
  CONSTRAINT chk_gaps_total_story_points_nonneg CHECK (total_story_points >= 0)
);

CREATE INDEX idx_gaps_status ON gaps(status);
CREATE INDEX idx_gaps_area ON gaps(area) WHERE area IS NOT NULL;
CREATE INDEX idx_gaps_activo ON gaps(activo);
CREATE INDEX idx_gaps_owner_usuario ON gaps(owner_usuario) WHERE owner_usuario IS NOT NULL;

CREATE TRIGGER set_gaps_updated_at
  BEFORE UPDATE ON gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gaps IS 'Brechas O2C; KPIs ponderados se enlazan vía catalog_kpis.gap_id';
COMMENT ON COLUMN gaps.total_story_points IS 'Cache opcional; puede alinearse con suma de story_points en acciones del gap';

-- -----------------------------------------------------------------------------
-- catalog_kpis: columnas métricas O2C
-- -----------------------------------------------------------------------------

ALTER TABLE catalog_kpis
  ADD COLUMN gap_id uuid REFERENCES gaps(id) ON DELETE SET NULL,
  ADD COLUMN weight numeric,
  ADD COLUMN baseline numeric,
  ADD COLUMN target_m18 numeric,
  ADD COLUMN direction catalog_kpi_direction,
  ADD COLUMN current_value numeric,
  ADD COLUMN in_global_portfolio boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN catalog_kpis.gap_id IS 'Gap O2C; NULL = KPI de catálogo sin brecha';
COMMENT ON COLUMN catalog_kpis.weight IS 'Peso 0–1 dentro del gap; suma por gap (activos) = 1';
COMMENT ON COLUMN catalog_kpis.baseline IS 'Línea base para cumplimiento O2C';
COMMENT ON COLUMN catalog_kpis.target_m18 IS 'Meta explícita (p.ej. M18); independiente de meta_objetivo legacy';
COMMENT ON COLUMN catalog_kpis.direction IS 'maximize | minimize';
COMMENT ON COLUMN catalog_kpis.current_value IS 'Último valor cache (opcional); preferir catalog_kpi_measurements';
COMMENT ON COLUMN catalog_kpis.in_global_portfolio IS 'Si true y activo con gap_id, cuenta en suma de pesos global';

ALTER TABLE catalog_kpis
  ADD CONSTRAINT chk_catalog_kpis_weight_range CHECK (
    weight IS NULL OR (weight >= 0::numeric AND weight <= 1::numeric)
  );

ALTER TABLE catalog_kpis
  ADD CONSTRAINT chk_catalog_kpis_weight_when_gap_active CHECK (
    gap_id IS NULL
    OR activo = false
    OR weight IS NOT NULL
  );

CREATE INDEX idx_catalog_kpis_gap_id ON catalog_kpis(gap_id) WHERE gap_id IS NOT NULL;
CREATE INDEX idx_catalog_kpis_global_portfolio
  ON catalog_kpis(in_global_portfolio)
  WHERE in_global_portfolio = true AND gap_id IS NOT NULL AND activo = true;

-- -----------------------------------------------------------------------------
-- Validación de pesos (diferida: permite ajustes multi-fila en una transacción)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION catalog_kpis_validate_weight_sums()
RETURNS TRIGGER AS $$
DECLARE
  tol constant numeric := 0.0001;
  r record;
  global_sum numeric;
BEGIN
  -- Por gap: si hay al menos un KPI activo con gap_id, la suma de weight debe ser ~1
  FOR r IN
    SELECT ck.gap_id AS gid, COALESCE(SUM(ck.weight), 0::numeric) AS wsum
    FROM catalog_kpis ck
    WHERE ck.activo = true AND ck.gap_id IS NOT NULL
    GROUP BY ck.gap_id
  LOOP
    IF ABS(r.wsum - 1::numeric) > tol THEN
      RAISE EXCEPTION
        'Suma de pesos por gap debe ser 1.0 (gap_id=%). Actual: %',
        r.gid,
        r.wsum;
    END IF;
  END LOOP;

  -- Global: KPIs activos con gap y en portfolio global deben sumar ~1 si existe al menos uno
  IF EXISTS (
    SELECT 1 FROM catalog_kpis
    WHERE activo = true
      AND gap_id IS NOT NULL
      AND in_global_portfolio = true
  ) THEN
    SELECT COALESCE(SUM(weight), 0::numeric)
    INTO global_sum
    FROM catalog_kpis
    WHERE activo = true
      AND gap_id IS NOT NULL
      AND in_global_portfolio = true;

    IF ABS(global_sum - 1::numeric) > tol THEN
      RAISE EXCEPTION
        'Suma de pesos del portfolio global (activos, con gap, in_global_portfolio) debe ser 1.0. Actual: %',
        global_sum;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_catalog_kpis_validate_weight_sums
  AFTER INSERT OR DELETE OR UPDATE OF gap_id, weight, activo, in_global_portfolio
  ON catalog_kpis
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION catalog_kpis_validate_weight_sums();

-- -----------------------------------------------------------------------------
-- catalog_kpi_measurements (histórico; distinto de kpi_mediciones legacy)
-- -----------------------------------------------------------------------------

CREATE TABLE catalog_kpi_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_kpi_id uuid NOT NULL REFERENCES catalog_kpis(id) ON DELETE CASCADE,
  medido_en timestamptz NOT NULL DEFAULT now(),
  valor numeric NOT NULL,
  fuente text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_kpi_measurements_kpi_medido
  ON catalog_kpi_measurements(catalog_kpi_id, medido_en DESC);

COMMENT ON TABLE catalog_kpi_measurements IS 'Series temporales para KPIs de catálogo O2C (no confundir con kpi_mediciones)';

-- -----------------------------------------------------------------------------
-- global_score_snapshots
-- -----------------------------------------------------------------------------

CREATE TABLE global_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score numeric NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_global_score_snapshots_score_range CHECK (score >= 0::numeric AND score <= 1::numeric)
);

CREATE INDEX idx_global_score_snapshots_created_at ON global_score_snapshots(created_at DESC);

COMMENT ON TABLE global_score_snapshots IS 'Snapshots del score global O2C (0–1); metadata opcional (on_track / at_risk / off_track)';

-- -----------------------------------------------------------------------------
-- gap_actions_log (eventos; no actualiza KPI aquí)
-- -----------------------------------------------------------------------------

CREATE TABLE gap_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id uuid NOT NULL REFERENCES gaps(id) ON DELETE CASCADE,
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT chk_gap_actions_log_event_type CHECK (char_length(trim(event_type)) >= 1)
);

CREATE INDEX idx_gap_actions_log_gap_id ON gap_actions_log(gap_id);
CREATE INDEX idx_gap_actions_log_accion_id ON gap_actions_log(accion_id);
CREATE INDEX idx_gap_actions_log_created_at ON gap_actions_log(created_at DESC);

COMMENT ON TABLE gap_actions_log IS 'Eventos acción↔gap (p.ej. cierre); no escribe mediciones ni current_value';

-- -----------------------------------------------------------------------------
-- acciones_diarias: vínculos opcionales gap / KPI catálogo (kpi_afectado legacy se mantiene)
-- -----------------------------------------------------------------------------

ALTER TABLE acciones_diarias
  ADD COLUMN gap_id uuid REFERENCES gaps(id) ON DELETE SET NULL,
  ADD COLUMN story_points numeric NOT NULL DEFAULT 0,
  ADD COLUMN catalog_kpi_id uuid REFERENCES catalog_kpis(id) ON DELETE SET NULL;

ALTER TABLE acciones_diarias
  ADD CONSTRAINT chk_acciones_story_points_nonneg CHECK (story_points >= 0::numeric);

CREATE INDEX idx_acciones_diarias_gap_id ON acciones_diarias(gap_id) WHERE gap_id IS NOT NULL;
CREATE INDEX idx_acciones_diarias_catalog_kpi_id ON acciones_diarias(catalog_kpi_id) WHERE catalog_kpi_id IS NOT NULL;

COMMENT ON COLUMN acciones_diarias.gap_id IS 'Brecha O2C opcional; convive con kpi_afectado legacy';
COMMENT ON COLUMN acciones_diarias.story_points IS 'Puntos de historia para progreso del gap';
COMMENT ON COLUMN acciones_diarias.catalog_kpi_id IS 'KPI de catálogo O2C opcional';

-- -----------------------------------------------------------------------------
-- Coherencia gap_id en log vs acción
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gap_actions_log_match_accion_gap()
RETURNS TRIGGER AS $$
DECLARE
  ag uuid;
BEGIN
  SELECT a.gap_id INTO ag FROM acciones_diarias a WHERE a.id = NEW.accion_id;
  IF ag IS DISTINCT FROM NEW.gap_id THEN
    RAISE EXCEPTION 'gap_id del log debe coincidir con acciones_diarias.gap_id para la acción';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gap_actions_log_match_accion_gap
  BEFORE INSERT OR UPDATE OF gap_id, accion_id ON gap_actions_log
  FOR EACH ROW
  EXECUTE FUNCTION gap_actions_log_match_accion_gap();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY gaps_select_authenticated ON gaps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY gaps_insert_admin ON gaps
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY gaps_update_admin ON gaps
  FOR UPDATE USING (is_app_admin());

CREATE POLICY gaps_delete_admin ON gaps
  FOR DELETE USING (is_app_admin());

-- catalog_kpis: habilitar RLS alineado a catálogos administrados
ALTER TABLE catalog_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_kpis_select_authenticated ON catalog_kpis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY catalog_kpis_insert_admin ON catalog_kpis
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY catalog_kpis_update_admin ON catalog_kpis
  FOR UPDATE USING (is_app_admin());

CREATE POLICY catalog_kpis_delete_admin ON catalog_kpis
  FOR DELETE USING (is_app_admin());

ALTER TABLE catalog_kpi_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_kpi_measurements_select_authenticated ON catalog_kpi_measurements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY catalog_kpi_measurements_insert_admin ON catalog_kpi_measurements
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY catalog_kpi_measurements_update_admin ON catalog_kpi_measurements
  FOR UPDATE USING (is_app_admin());

CREATE POLICY catalog_kpi_measurements_delete_admin ON catalog_kpi_measurements
  FOR DELETE USING (is_app_admin());

ALTER TABLE global_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY global_score_snapshots_select_authenticated ON global_score_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY global_score_snapshots_insert_admin ON global_score_snapshots
  FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY global_score_snapshots_update_admin ON global_score_snapshots
  FOR UPDATE USING (is_app_admin());

CREATE POLICY global_score_snapshots_delete_admin ON global_score_snapshots
  FOR DELETE USING (is_app_admin());

ALTER TABLE gap_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY gap_actions_log_select_authenticated ON gap_actions_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert: quien puede actualizar la acción vinculada (cierre / eventos)
CREATE POLICY gap_actions_log_insert_responsable_or_admin ON gap_actions_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_id
        AND (a.responsable = get_my_usuario_id() OR is_app_admin())
    )
  );

CREATE POLICY gap_actions_log_update_admin ON gap_actions_log
  FOR UPDATE USING (is_app_admin());

CREATE POLICY gap_actions_log_delete_admin ON gap_actions_log
  FOR DELETE USING (is_app_admin());


-- >>> FILE: 20260313600000_catalog_kpi_o2c_columns_and_weights.sql
-- =============================================================================
-- Catálogo KPI O2C: calc_type, metas m6/m12, umbrales semáforo, responsable KPI,
-- notas y medidor en mediciones; validación de pesos solo portfolio global.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipo de cálculo de negocio (independiente de direction legacy)
-- -----------------------------------------------------------------------------

CREATE TYPE catalog_kpi_calc_type AS ENUM (
  'minimize',
  'maximize',
  'binary'
);

COMMENT ON TYPE catalog_kpi_calc_type IS 'Cómo interpretar baseline/meta/valor para cumplimiento O2C';

-- -----------------------------------------------------------------------------
-- catalog_kpis: nuevas columnas
-- -----------------------------------------------------------------------------

ALTER TABLE catalog_kpis
  ADD COLUMN calc_type catalog_kpi_calc_type,
  ADD COLUMN target_m6 numeric,
  ADD COLUMN target_m12 numeric,
  ADD COLUMN threshold_green numeric,
  ADD COLUMN threshold_yellow numeric,
  ADD COLUMN owner_usuario uuid REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN catalog_kpis.calc_type IS 'minimize | maximize | binary; preferido sobre direction para nuevas filas';
COMMENT ON COLUMN catalog_kpis.target_m6 IS 'Meta horizonte M6 (nullable)';
COMMENT ON COLUMN catalog_kpis.target_m12 IS 'Meta horizonte M12 (nullable)';
COMMENT ON COLUMN catalog_kpis.threshold_green IS 'Umbral mínimo de cumplimiento (0–1) para verde; green >= yellow';
COMMENT ON COLUMN catalog_kpis.threshold_yellow IS 'Umbral mínimo de cumplimiento (0–1) para amarillo';
COMMENT ON COLUMN catalog_kpis.owner_usuario IS 'Responsable del KPI (catálogo O2C)';

COMMENT ON COLUMN catalog_kpis.weight IS 'Peso 0–1; la suma global de activos con gap y en portfolio debe ser ~1 (no se valida por gap)';

ALTER TABLE catalog_kpis
  ADD CONSTRAINT chk_catalog_kpis_thresholds_semaforo CHECK (
    (threshold_green IS NULL OR (threshold_green >= 0::numeric AND threshold_green <= 1::numeric))
    AND (threshold_yellow IS NULL OR (threshold_yellow >= 0::numeric AND threshold_yellow <= 1::numeric))
    AND (
      threshold_green IS NULL
      OR threshold_yellow IS NULL
      OR threshold_green >= threshold_yellow
    )
  );

CREATE INDEX idx_catalog_kpis_owner_usuario
  ON catalog_kpis(owner_usuario)
  WHERE owner_usuario IS NOT NULL;

-- Backfill calc_type desde direction (maximize/minimize); binary queda NULL hasta asignación manual
UPDATE catalog_kpis
SET calc_type = CASE direction
  WHEN 'maximize'::catalog_kpi_direction THEN 'maximize'::catalog_kpi_calc_type
  WHEN 'minimize'::catalog_kpi_direction THEN 'minimize'::catalog_kpi_calc_type
END
WHERE direction IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Validación de pesos: solo suma global del portfolio (sin validar por gap)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION catalog_kpis_validate_weight_sums()
RETURNS TRIGGER AS $$
DECLARE
  tol constant numeric := 0.0001;
  global_sum numeric;
BEGIN
  -- Global: KPIs activos con gap y en portfolio global deben sumar ~1 si existe al menos uno
  IF EXISTS (
    SELECT 1 FROM catalog_kpis
    WHERE activo = true
      AND gap_id IS NOT NULL
      AND in_global_portfolio = true
  ) THEN
    SELECT COALESCE(SUM(weight), 0::numeric)
    INTO global_sum
    FROM catalog_kpis
    WHERE activo = true
      AND gap_id IS NOT NULL
      AND in_global_portfolio = true;

    IF ABS(global_sum - 1::numeric) > tol THEN
      RAISE EXCEPTION
        'Suma de pesos del portfolio global (activos, con gap, in_global_portfolio) debe ser 1.0. Actual: %',
        global_sum;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- catalog_kpi_measurements: notes, measured_by
-- -----------------------------------------------------------------------------

ALTER TABLE catalog_kpi_measurements
  ADD COLUMN notes text,
  ADD COLUMN measured_by uuid REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN catalog_kpi_measurements.notes IS 'Notas de la medición';
COMMENT ON COLUMN catalog_kpi_measurements.measured_by IS 'Usuario que registró la medición';

CREATE INDEX idx_catalog_kpi_measurements_measured_by
  ON catalog_kpi_measurements(measured_by)
  WHERE measured_by IS NOT NULL;

-- RLS: mismas políticas por fila; nuevas columnas heredan INSERT/UPDATE admin.
-- Sin cambios adicionales: mediciones siguen siendo administración centralizada.


-- >>> FILE: 20260313610000_seed_o2c_demo_catalog.sql
-- =============================================================================
-- Seed opcional: gap + 4 KPIs demo (pesos 0.25 c/u → suma global 1.0).
-- Solo se inserta si catalog_kpis está vacío (no pisar entornos con datos).
-- =============================================================================

DO $$
DECLARE
  gid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM catalog_kpis LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO gaps (nombre, descripcion, status, area, activo)
  VALUES (
    'Demo O2C — Brecha única',
    'Datos de ejemplo; ajustar o borrar en producción.',
    'open',
    'Operaciones',
    true
  )
  RETURNING id INTO gid;

  INSERT INTO catalog_kpis (
    nombre,
    unidad,
    tipo,
    periodicidad,
    orden,
    activo,
    gap_id,
    weight,
    baseline,
    target_m18,
    calc_type,
    direction,
    in_global_portfolio,
    threshold_green,
    threshold_yellow
  )
  VALUES
    (
      'Demo — OTIF',
      'porcentaje',
      'manual',
      'mensual',
      1,
      true,
      gid,
      0.25,
      80,
      95,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'Demo — DSO',
      'porcentaje',
      'manual',
      'mensual',
      2,
      true,
      gid,
      0.25,
      45,
      30,
      'minimize'::catalog_kpi_calc_type,
      'minimize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'Demo — Exactitud facturación',
      'porcentaje',
      'manual',
      'mensual',
      3,
      true,
      gid,
      0.25,
      90,
      99.5,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'Demo — Indicador binario',
      'porcentaje',
      'manual',
      'mensual',
      4,
      true,
      gid,
      0.25,
      0,
      1,
      'binary'::catalog_kpi_calc_type,
      NULL,
      true,
      0.85,
      0.65
    );
END $$;


-- >>> FILE: 20260313620000_seed_o2c_portfolio_10_kpis.sql
-- =============================================================================
-- Seed O2C: 10 KPIs de catálogo + 5 gaps (pesos globales ∑ = 1.0).
-- Fuente de criterios: KPIs "sagrados" y métricas O2C habituales
-- (docs/dashboard-spec.md §10.1) + complementos de ciclo pedido–cobro.
--
-- Idempotencia:
-- - Si ya existe un KPI con nombre 'O2C — OTIF', no hace nada.
-- - Si el catálogo está vacío, inserta gaps + KPIs.
-- - Si solo está el demo de 20260313610000 (gap "Demo O2C — Brecha única" y sus 4 KPIs),
--   elimina ese demo e inserta este portafolio.
-- En cualquier otro caso (datos personalizados mezclados), no inserta para no romper
-- la validación de suma de pesos del portfolio global.
-- =============================================================================

DO $$
DECLARE
  total_ck integer;
  demo_ck integer;
  gid_pedido uuid;
  gid_cumplimiento uuid;
  gid_facturacion uuid;
  gid_cobranza uuid;
  gid_rentabilidad uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM catalog_kpis WHERE nombre = 'O2C — OTIF') THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer INTO total_ck FROM catalog_kpis;

  SELECT COUNT(*)::integer INTO demo_ck
  FROM catalog_kpis ck
  INNER JOIN gaps g ON g.id = ck.gap_id
  WHERE g.nombre = 'Demo O2C — Brecha única';

  IF total_ck > 0 AND (demo_ck IS DISTINCT FROM total_ck OR demo_ck = 0) THEN
    RETURN;
  END IF;

  IF demo_ck > 0 THEN
    DELETE FROM catalog_kpis
    WHERE gap_id IN (SELECT id FROM gaps WHERE nombre = 'Demo O2C — Brecha única');
    DELETE FROM gaps WHERE nombre = 'Demo O2C — Brecha única';
  END IF;

  INSERT INTO gaps (nombre, descripcion, status, area, activo)
  VALUES
    (
      'O2C — Pedido y oferta',
      'Desde la captura del pedido hasta la confirmación de disponibilidad y condiciones comerciales.',
      'open',
      'Comercial',
      true
    ),
    (
      'O2C — Cumplimiento y entrega',
      'Planificación, despacho y entrega; calidad de servicio en campo.',
      'open',
      'Operaciones',
      true
    ),
    (
      'O2C — Facturación y registro',
      'Emisión correcta y oportuna de documentos y registro contable.',
      'open',
      'Finanzas',
      true
    ),
    (
      'O2C — Cobranza y capital de trabajo',
      'Recuperación de efectivo y gestión de cuentas por cobrar.',
      'open',
      'Finanzas',
      true
    ),
    (
      'O2C — Rentabilidad y experiencia de cliente',
      'Margen y percepción del cliente sobre el ciclo completo.',
      'open',
      'Dirección',
      true
    );

  SELECT id INTO gid_pedido FROM gaps WHERE nombre = 'O2C — Pedido y oferta';
  SELECT id INTO gid_cumplimiento FROM gaps WHERE nombre = 'O2C — Cumplimiento y entrega';
  SELECT id INTO gid_facturacion FROM gaps WHERE nombre = 'O2C — Facturación y registro';
  SELECT id INTO gid_cobranza FROM gaps WHERE nombre = 'O2C — Cobranza y capital de trabajo';
  SELECT id INTO gid_rentabilidad FROM gaps WHERE nombre = 'O2C — Rentabilidad y experiencia de cliente';

  INSERT INTO catalog_kpis (
    nombre,
    descripcion,
    unidad,
    tipo,
    periodicidad,
    orden,
    activo,
    gap_id,
    weight,
    baseline,
    target_m6,
    target_m12,
    target_m18,
    calc_type,
    direction,
    in_global_portfolio,
    threshold_green,
    threshold_yellow
  )
  VALUES
    (
      'O2C — OTIF',
      'On time in full: entregas a tiempo y completas respecto al pedido.',
      'porcentaje',
      'manual',
      'mensual',
      1,
      true,
      gid_cumplimiento,
      0.15,
      85,
      90,
      92,
      95,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — OTD (cumplimiento fecha promesa)',
      'Porcentaje de pedidos entregados en la fecha prometida al cliente.',
      'porcentaje',
      'manual',
      'mensual',
      2,
      true,
      gid_cumplimiento,
      0.10,
      80,
      85,
      88,
      92,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Incidencias de calidad',
      'Incidencias de calidad registradas en el período (menor es mejor).',
      'numero',
      'manual',
      'mensual',
      3,
      true,
      gid_cumplimiento,
      0.08,
      25,
      15,
      10,
      8,
      'minimize'::catalog_kpi_calc_type,
      'minimize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Evidencias T+0',
      'Evidencia de entrega cargada el mismo día de la acción operativa.',
      'porcentaje',
      'manual',
      'mensual',
      4,
      true,
      gid_facturacion,
      0.10,
      88,
      92,
      95,
      98,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Exactitud de facturación',
      'Facturas sin error respecto a pedido, precios y cantidades.',
      'porcentaje',
      'manual',
      'mensual',
      5,
      true,
      gid_facturacion,
      0.10,
      97,
      98,
      99,
      99.5,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — DSO',
      'Días de ventas pendientes de cobro (Days Sales Outstanding).',
      'dias',
      'manual',
      'mensual',
      6,
      true,
      gid_cobranza,
      0.12,
      52,
      45,
      40,
      35,
      'minimize'::catalog_kpi_calc_type,
      'minimize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Rotación de cartera',
      'Veces que se cobra el saldo de cuentas por cobrar en el año (mayor es mejor).',
      'veces',
      'manual',
      'mensual',
      7,
      true,
      gid_cobranza,
      0.05,
      6,
      7,
      7.5,
      8,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Margen bruto',
      'Margen bruto sobre ventas (política de precios y costos).',
      'porcentaje',
      'manual',
      'mensual',
      8,
      true,
      gid_rentabilidad,
      0.12,
      14,
      15,
      16.5,
      18,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — NPS',
      'Net Promoter Score: % promotores − % detractores.',
      'puntos',
      'manual',
      'mensual',
      9,
      true,
      gid_pedido,
      0.08,
      12,
      18,
      26,
      35,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    ),
    (
      'O2C — Perfect order rate',
      'Pedidos completos, a tiempo, sin incidencias ni reclamos en primera entrega.',
      'porcentaje',
      'manual',
      'mensual',
      10,
      true,
      gid_cumplimiento,
      0.10,
      78,
      82,
      86,
      90,
      'maximize'::catalog_kpi_calc_type,
      'maximize'::catalog_kpi_direction,
      true,
      0.85,
      0.65
    );
END $$;


-- >>> FILE: 20260313630000_seed_areas_o2c_gaps.sql
-- =============================================================================
-- Catálogo areas: alineado a gaps O2C (20260313620000_seed_o2c_portfolio_10_kpis).
-- Inserta solo filas que aún no existan (único por lower(trim(nombre))).
-- =============================================================================

INSERT INTO areas (nombre, descripcion, activo)
SELECT v.nombre, v.descripcion, true
FROM (
  VALUES
    (
      'Comercial',
      'Pedido, oferta y relación con el cliente; alinea gaps O2C de captura y condiciones comerciales.'
    ),
    (
      'Operaciones',
      'Planificación, despacho, entrega y calidad en campo; alinea gaps O2C de cumplimiento (p. ej. OTIF, OTD).'
    ),
    (
      'Finanzas',
      'Facturación, registro contable, cobranza y gestión de capital de trabajo en el ciclo O2C.'
    ),
    (
      'Dirección',
      'Rentabilidad, experiencia de cliente y visión del ciclo pedido–cobro completo.'
    )
) AS v(nombre, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM areas a
  WHERE lower(trim(a.nombre)) = lower(trim(v.nombre))
);


-- >>> FILE: 20260313640000_seed_statuses_acciones.sql
-- =============================================================================
-- Catálogo statuses: alineado al enum action_status (acciones_diarias.estado)
-- y al orden de columnas del Kanban (KanbanBoard COLUMN_ORDER).
-- Colores coherentes con COLUMN_STYLES en src/features/operations/components/KanbanBoard.tsx
-- =============================================================================

INSERT INTO statuses (nombre, descripcion, color, orden, es_cierre, activo)
SELECT v.nombre, v.descripcion, v.color, v.orden, v.es_cierre, true
FROM (
  VALUES
    (
      'Pendiente',
      'Acción creada, aún no programada para hoy ni en ejecución.',
      '#94a3b8',
      1,
      false
    ),
    (
      'Hoy',
      'Acción programada para hoy; pendiente de iniciar.',
      '#fbbf24',
      2,
      false
    ),
    (
      'En_Ejecucion',
      'Acción en curso.',
      '#60a5fa',
      3,
      false
    ),
    (
      'Bloqueado',
      'Acción detenida por un impedimento; requiere desbloqueo.',
      '#f87171',
      4,
      false
    ),
    (
      'Retraso',
      'Acción que superó su fecha o hora límite sin completarse.',
      '#f97316',
      5,
      false
    ),
    (
      'Hecho',
      'Acción completada con evidencia cargada.',
      '#34d399',
      6,
      true
    ),
    (
      'Verificado',
      'Acción cerrada y verificada.',
      '#a78bfa',
      7,
      true
    )
) AS v(nombre, descripcion, color, orden, es_cierre)
WHERE NOT EXISTS (
  SELECT 1 FROM statuses s
  WHERE lower(trim(s.nombre)) = lower(trim(v.nombre))
);


-- >>> FILE: 20260313700000_accion_gaps_and_catalog_kpis_junction.sql
-- =============================================================================
-- Acciones: múltiples gaps y KPIs de catálogo (tablas puente).
-- Mantiene gap_id / catalog_kpi_id en acciones_diarias como "primario" (primer id)
-- para compatibilidad con código existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas puente
-- -----------------------------------------------------------------------------

CREATE TABLE accion_gaps (
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  gap_id uuid NOT NULL REFERENCES gaps(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (accion_id, gap_id)
);

CREATE INDEX idx_accion_gaps_gap_id ON accion_gaps(gap_id);

COMMENT ON TABLE accion_gaps IS 'Brechas O2C impactadas por la acción (N:N)';

CREATE TABLE accion_catalog_kpis (
  accion_id uuid NOT NULL REFERENCES acciones_diarias(id) ON DELETE CASCADE,
  catalog_kpi_id uuid NOT NULL REFERENCES catalog_kpis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (accion_id, catalog_kpi_id)
);

CREATE INDEX idx_accion_catalog_kpis_kpi ON accion_catalog_kpis(catalog_kpi_id);

COMMENT ON TABLE accion_catalog_kpis IS 'KPIs de catálogo impactados por la acción (N:N)';

-- -----------------------------------------------------------------------------
-- Backfill desde columnas legacy
-- -----------------------------------------------------------------------------

INSERT INTO accion_gaps (accion_id, gap_id)
SELECT id, gap_id
FROM acciones_diarias
WHERE gap_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO accion_catalog_kpis (accion_id, catalog_kpi_id)
SELECT id, catalog_kpi_id
FROM acciones_diarias
WHERE catalog_kpi_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Trigger: gap_actions_log debe aceptar cualquier gap vinculado a la acción
-- (columna primaria o fila en accion_gaps).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gap_actions_log_match_accion_gap()
RETURNS TRIGGER AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM acciones_diarias a
    WHERE a.id = NEW.accion_id
      AND (
        a.gap_id IS NOT DISTINCT FROM NEW.gap_id
        OR EXISTS (
          SELECT 1 FROM accion_gaps ag
          WHERE ag.accion_id = a.id AND ag.gap_id = NEW.gap_id
        )
      )
  )
  INTO ok;

  IF NOT ok THEN
    RAISE EXCEPTION
      'gap_id del log debe estar vinculado a la acción (acciones_diarias.gap_id o accion_gaps)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- RLS (alineado a acciones: lectura amplia; escritura si responsable/creador/admin)
-- -----------------------------------------------------------------------------

ALTER TABLE accion_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE accion_catalog_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY accion_gaps_select_authenticated ON accion_gaps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_gaps_insert_responsable_creator_admin ON accion_gaps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_gaps.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );

CREATE POLICY accion_gaps_delete_responsable_creator_admin ON accion_gaps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_gaps.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );

CREATE POLICY accion_catalog_kpis_select_authenticated ON accion_catalog_kpis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY accion_catalog_kpis_insert_responsable_creator_admin ON accion_catalog_kpis
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_catalog_kpis.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );

CREATE POLICY accion_catalog_kpis_delete_responsable_creator_admin ON accion_catalog_kpis
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM acciones_diarias a
      WHERE a.id = accion_catalog_kpis.accion_id
        AND (
          a.responsable = get_my_usuario_id()
          OR (a.created_by IS NOT NULL AND a.created_by = get_my_usuario_id())
          OR is_app_admin()
        )
    )
  );


-- >>> FILE: 20260313800000_seed_dummy_acciones_o2c_demo.sql
-- =============================================================================
-- Demo: 10 acciones O2C dummy (desde 2026-04-01), fechas objetivo ≤ 30 días,
--       multi-gap y multi-KPI (puente + columnas primarias).
-- Requiere: seed O2C (gaps + catalog_kpis) y al menos un usuario en `usuarios`.
-- Idempotente: borra acciones cuyo título empieza por 'DEMO O2C ·' y reinserta.
-- =============================================================================

DO $$
DECLARE
  u_own   uuid;
  u_alt   uuid;
  g_ped   uuid;
  g_cum   uuid;
  g_fac   uuid;
  g_cob   uuid;
  g_ren   uuid;
  k_otif  uuid;
  k_otd   uuid;
  k_inci  uuid;
  k_ev_t0 uuid;
  k_exac  uuid;
  k_dso   uuid;
  k_rot   uuid;
  k_mar   uuid;
  k_nps   uuid;
  k_por   uuid;

  a1  uuid := 'f0e1c2d3-0001-4000-8000-000000000001';
  a2  uuid := 'f0e1c2d3-0002-4000-8000-000000000002';
  a3  uuid := 'f0e1c2d3-0003-4000-8000-000000000003';
  a4  uuid := 'f0e1c2d3-0004-4000-8000-000000000004';
  a5  uuid := 'f0e1c2d3-0005-4000-8000-000000000005';
  a6  uuid := 'f0e1c2d3-0006-4000-8000-000000000006';
  a7  uuid := 'f0e1c2d3-0007-4000-8000-000000000007';
  a8  uuid := 'f0e1c2d3-0008-4000-8000-000000000008';
  a9  uuid := 'f0e1c2d3-0009-4000-8000-000000000009';
  a10 uuid := 'f0e1c2d3-000a-4000-8000-00000000000a';
BEGIN
  SELECT id INTO u_own FROM usuarios ORDER BY created_at LIMIT 1;
  IF u_own IS NULL THEN
    RAISE NOTICE 'seed_dummy_acciones_o2c_demo: sin filas en usuarios; se omite.';
    RETURN;
  END IF;
  SELECT id INTO u_alt FROM usuarios ORDER BY created_at OFFSET 1 LIMIT 1;
  IF u_alt IS NULL THEN u_alt := u_own; END IF;

  SELECT id INTO g_ped FROM gaps WHERE nombre = 'O2C — Pedido y oferta' LIMIT 1;
  SELECT id INTO g_cum FROM gaps WHERE nombre = 'O2C — Cumplimiento y entrega' LIMIT 1;
  SELECT id INTO g_fac FROM gaps WHERE nombre = 'O2C — Facturación y registro' LIMIT 1;
  SELECT id INTO g_cob FROM gaps WHERE nombre = 'O2C — Cobranza y capital de trabajo' LIMIT 1;
  SELECT id INTO g_ren FROM gaps WHERE nombre = 'O2C — Rentabilidad y experiencia de cliente' LIMIT 1;

  IF g_ped IS NULL OR g_cum IS NULL THEN
    RAISE NOTICE 'seed_dummy_acciones_o2c_demo: gaps O2C no encontrados; se omite.';
    RETURN;
  END IF;

  SELECT id INTO k_otif FROM catalog_kpis WHERE nombre = 'O2C — OTIF' LIMIT 1;
  SELECT id INTO k_otd FROM catalog_kpis WHERE nombre = 'O2C — OTD (cumplimiento fecha promesa)' LIMIT 1;
  SELECT id INTO k_inci FROM catalog_kpis WHERE nombre = 'O2C — Incidencias de calidad' LIMIT 1;
  SELECT id INTO k_ev_t0 FROM catalog_kpis WHERE nombre = 'O2C — Evidencias T+0' LIMIT 1;
  SELECT id INTO k_exac FROM catalog_kpis WHERE nombre = 'O2C — Exactitud de facturación' LIMIT 1;
  SELECT id INTO k_dso FROM catalog_kpis WHERE nombre = 'O2C — DSO' LIMIT 1;
  SELECT id INTO k_rot FROM catalog_kpis WHERE nombre = 'O2C — Rotación de cartera' LIMIT 1;
  SELECT id INTO k_mar FROM catalog_kpis WHERE nombre = 'O2C — Margen bruto' LIMIT 1;
  SELECT id INTO k_nps FROM catalog_kpis WHERE nombre = 'O2C — NPS' LIMIT 1;
  SELECT id INTO k_por FROM catalog_kpis WHERE nombre = 'O2C — Perfect order rate' LIMIT 1;

  IF k_otif IS NULL THEN
    RAISE NOTICE 'seed_dummy_acciones_o2c_demo: catalog_kpis O2C no encontrados; se omite.';
    RETURN;
  END IF;

  DELETE FROM accion_catalog_kpis
  WHERE accion_id IN (SELECT id FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%');
  DELETE FROM accion_gaps
  WHERE accion_id IN (SELECT id FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%');
  DELETE FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%';

  INSERT INTO acciones_diarias (
    id, fecha, titulo_accion, descripcion_accion, responsable, created_by,
    hora_limite, evidencia_esperada, evidencia_cargada, estado, prioridad,
    area, gap_id, catalog_kpi_id, story_points, created_at, updated_at
  ) VALUES
  (
    a1, DATE '2026-04-08',
    'DEMO O2C · Taller captura de pedido y checklist único',
    'Cómo: Facilitar taller de 90 min con comercial y planeación para mapear el flujo de pedido y oferta.' || E'\n\n' ||
    'Quiero: Un checklist único de 12 campos obligatorios antes de confirmar al cliente.' || E'\n\n' ||
    'Para qué: Mejorar NPS en pedido y perfect order rate sin re-trabajo en cumplimiento.',
    u_alt, u_own, TIME '10:30',
    'Acta del taller con checklist acordado y responsables por campo', false,
    'En_Ejecucion'::action_status, 'P1_Critica'::prioridad_nc,
    'Comercial', g_ped, k_nps, 8,
    TIMESTAMPTZ '2026-04-01 09:12:00+00', TIMESTAMPTZ '2026-04-01 09:12:00+00'
  ),
  (
    a2, DATE '2026-04-05',
    'DEMO O2C · Huddle OTIF/OTD con operaciones (15 min)',
    'Cómo: Instalar un huddle diario 15 min entre planeación y última milla con tablero compartido.' || E'\n\n' ||
    'Quiero: Compromiso explícito de fecha promesa y excepciones visibles el mismo día.' || E'\n\n' ||
    'Para qué: Subir OTIF y OTD sin aumentar incidencias de calidad.',
    u_own, u_own, TIME '07:45',
    'Captura de pantalla del tablero + notas del huddle (día actual)', false,
    'Hoy'::action_status, 'P1_Critica'::prioridad_nc,
    'Operaciones', g_cum, k_otif, 5,
    TIMESTAMPTZ '2026-04-01 10:05:00+00', TIMESTAMPTZ '2026-04-01 10:05:00+00'
  ),
  (
    a3, DATE '2026-04-12',
    'DEMO O2C · Piloto evidencia T+0 en facturación (2 cuentas)',
    'Cómo: Ejecutar piloto en dos cuentas clave con carga de evidencia el mismo día del cierre operativo.' || E'\n\n' ||
    'Quiero: Plantilla mínima de evidencia y trazabilidad en el sistema.' || E'\n\n' ||
    'Para qué: Subir Evidencias T+0 y Exactitud de facturación en el gap financiero.',
    u_alt, u_own, TIME '16:00',
    'ZIP con evidencias T+0 y conciliación vs pedido (piloto)', false,
    'Pendiente'::action_status, 'P2_Media'::prioridad_nc,
    'Finanzas', g_fac, k_ev_t0, 5,
    TIMESTAMPTZ '2026-04-01 11:40:00+00', TIMESTAMPTZ '2026-04-01 11:40:00+00'
  ),
  (
    a4, DATE '2026-04-18',
    'DEMO O2C · Playbook cobranza 30-60-90 y DSO por cartera',
    'Cómo: Diseñar playbook con pasos 30-60-90 días y responsables financieros/comercial.' || E'\n\n' ||
    'Quiero: Reglas de escalamiento y métricas semanales en un solo lugar.' || E'\n\n' ||
    'Para qué: Reducir DSO y mejorar rotación de cartera sin romper relación con cliente.',
    u_own, u_alt, TIME '14:15',
    'Documento del playbook v1 y lista de cuentas piloto firmada', false,
    'Bloqueado'::action_status, 'P1_Critica'::prioridad_nc,
    'Finanzas', g_cob, k_dso, 13,
    TIMESTAMPTZ '2026-04-01 13:22:00+00', TIMESTAMPTZ '2026-04-01 13:22:00+00'
  ),
  (
    a5, DATE '2026-04-22',
    'DEMO O2C · Tablero margen bruto por cuenta clave',
    'Cómo: Construir vista semanal de margen por cuenta con costos y descuentos auditables.' || E'\n\n' ||
    'Quiero: Alertas cuando el margen cae 2 pts vs plan en top 20 cuentas.' || E'\n\n' ||
    'Para qué: Sostener margen bruto y visibilidad para dirección.',
    u_alt, u_own, TIME '11:00',
    'Enlace al tablero + definición de umbrales acordados con finanzas', false,
    'Pendiente'::action_status, 'P2_Media'::prioridad_nc,
    'Dirección', g_ren, k_mar, 8,
    TIMESTAMPTZ '2026-04-01 14:08:00+00', TIMESTAMPTZ '2026-04-01 14:08:00+00'
  ),
  (
    a6, DATE '2026-04-06',
    'DEMO O2C · Cruce pedido–factura (exactitud + NPS)',
    'Cómo: Sesión conjunta comercial–finanzas para revisar 15 pedidos con mayor desvío de facturación.' || E'\n\n' ||
    'Quiero: Lista de causas raíz y corrección en catálogo de precios/cantidades.' || E'\n\n' ||
    'Para qué: Subir exactitud de facturación y experiencia (NPS) en el tramo pedido–cobro.',
    u_own, u_own, TIME '09:30',
    'Matriz de desvíos con acciones correctivas y dueños', false,
    'En_Ejecucion'::action_status, 'P2_Media'::prioridad_nc,
    'Comercial', g_ped, k_nps, 5,
    TIMESTAMPTZ '2026-04-01 15:55:00+00', TIMESTAMPTZ '2026-04-01 15:55:00+00'
  ),
  (
    a7, DATE '2026-04-14',
    'DEMO O2C · Puente OTIF–cartera (cumplimiento y cobranza)',
    'Cómo: Definir reglas cuando el retraso operativo afecta términos de pago y seguimiento de cobro.' || E'\n\n' ||
    'Quiero: Flujo único entre operaciones y cobranza con SLA de 48 h.' || E'\n\n' ||
    'Para qué: Alinear OTIF en entrega con DSO sin duplicar gestiones al cliente.',
    u_alt, u_alt, TIME '13:45',
    'Diagrama de flujo + acta con responsables de operaciones y finanzas', false,
    'Pendiente'::action_status, 'P1_Critica'::prioridad_nc,
    'Operaciones', g_cum, k_otif, 8,
    TIMESTAMPTZ '2026-04-01 16:30:00+00', TIMESTAMPTZ '2026-04-01 16:30:00+00'
  ),
  (
    a8, DATE '2026-04-25',
    'DEMO O2C · DSO por región: sprint de diagnóstico',
    'Cómo: Taller de 2 h con cada región para revisar cartera vencida y política de visitas.' || E'\n\n' ||
    'Quiero: Top 10 cuentas por región con plan de acción de 14 días.' || E'\n\n' ||
    'Para qué: Bajar DSO con foco en comportamiento real de cobro.',
    u_own, u_own, TIME '17:30',
    'Informe por región con DSO actual vs meta y riesgos', false,
    'Hoy'::action_status, 'P2_Media'::prioridad_nc,
    'Finanzas', g_cob, k_dso, 5,
    TIMESTAMPTZ '2026-04-01 17:10:00+00', TIMESTAMPTZ '2026-04-01 17:10:00+00'
  ),
  (
    a9, DATE '2026-04-03',
    'DEMO O2C · Plan reducción incidencias de calidad (30 días)',
    'Cómo: Analizar Pareto de incidencias en entrega y documentar contra-medidas en almacén y ruta.' || E'\n\n' ||
    'Quiero: Reducción medible de incidencias y refuerzo de OTIF en el mismo mes.' || E'\n\n' ||
    'Para qué: Mejorar cumplimiento y calidad percibida sin sacrificar velocidad.',
    u_alt, u_own, TIME '08:00',
    'Informe Pareto + plan 30 días con hitos semanales', true,
    'Hecho'::action_status, 'P2_Media'::prioridad_nc,
    'Operaciones', g_cum, k_inci, 13,
    TIMESTAMPTZ '2026-04-01 08:05:00+00', TIMESTAMPTZ '2026-04-02 09:00:00+00'
  ),
  (
    a10, DATE '2026-04-28',
    'DEMO O2C · Ciclo NPS + margen en cuenta estratégica',
    'Cómo: Diseñar encuesta corta post-entrega y cruzarla con margen de la cuenta en el mismo trimestre.' || E'\n\n' ||
    'Quiero: Una narrativa única para dirección: rentabilidad y voz del cliente.' || E'\n\n' ||
    'Para qué: Conectar rentabilidad y experiencia en el gap de dirección y pedido.',
    u_own, u_alt, TIME '12:15',
    'Presentación ejecutiva (PDF) con NPS, margen y acciones acordadas', false,
    'Verificado'::action_status, 'P3_Baja'::prioridad_nc,
    'Dirección', g_ren, k_nps, 3,
    TIMESTAMPTZ '2026-04-01 18:00:00+00', TIMESTAMPTZ '2026-04-03 10:00:00+00'
  );

  -- Puentes: múltiples gaps y KPIs por acción (primera fila = columnas en acciones_diarias ya puestas)
  INSERT INTO accion_gaps (accion_id, gap_id) VALUES
    (a1, g_ped), (a1, g_cum),
    (a2, g_cum),
    (a3, g_fac),
    (a4, g_cob),
    (a5, g_ren),
    (a6, g_ped), (a6, g_fac),
    (a7, g_cum), (a7, g_cob),
    (a8, g_cob),
    (a9, g_cum),
    (a10, g_ren), (a10, g_ped);

  INSERT INTO accion_catalog_kpis (accion_id, catalog_kpi_id) VALUES
    (a1, k_nps), (a1, k_por),
    (a2, k_otif), (a2, k_otd),
    (a3, k_ev_t0), (a3, k_exac),
    (a4, k_dso), (a4, k_rot),
    (a5, k_mar),
    (a6, k_nps), (a6, k_exac),
    (a7, k_otif), (a7, k_dso),
    (a8, k_dso),
    (a9, k_inci), (a9, k_otif),
    (a10, k_nps), (a10, k_mar);

  RAISE NOTICE 'seed_dummy_acciones_o2c_demo: insertadas 10 acciones DEMO O2C · (desde 2026-04-01).';
END;
$$;


-- >>> FILE: 20260313900000_catalog_kpis_current_value_default_baseline.sql
-- =============================================================================
-- Valor actual en catálogo: si no hay medición ni current_value, alinear con
-- baseline para que cumplimiento y score global O2C no queden "sin datos" en vacío.
-- Idempotente: solo actualiza filas con current_value NULL y baseline definido.
-- =============================================================================

UPDATE catalog_kpis
SET current_value = baseline
WHERE current_value IS NULL
  AND baseline IS NOT NULL;


-- >>> FILE: 20260314000000_seed_catalog_kpi_semaforo_demo_mix.sql
-- =============================================================================
-- Demo: mezcla de estados de semáforo en KPIs O2C del portafolio global
-- (En meta / En riesgo / Fuera / Sin datos) para score global y grillas.
--
-- Criterio (horizonte M18, umbrales por defecto 0.85 / 0.65 en cumplimiento 0–1):
-- - maximize: cumplimiento ≈ (current - baseline) / (target_m18 - baseline)
-- - minimize: cumplimiento ≈ (baseline - current) / (baseline - target_m18)
--
-- Requiere filas del seed O2C — 10 KPIs (nombres exactos). Idempotente por UPDATE.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM catalog_kpis WHERE nombre = 'O2C — OTIF' LIMIT 1) THEN
    RAISE NOTICE 'seed_catalog_kpi_semaforo_demo_mix: catálogo O2C no encontrado; se omite.';
    RETURN;
  END IF;

  -- En meta (cumplimiento alto / ≥ umbral verde)
  UPDATE catalog_kpis SET current_value = 94.0 WHERE nombre = 'O2C — OTIF';
  UPDATE catalog_kpis SET current_value = 97.0 WHERE nombre = 'O2C — Evidencias T+0';
  UPDATE catalog_kpis SET current_value = 17.6 WHERE nombre = 'O2C — Margen bruto';

  -- En riesgo (entre ~0.65 y ~0.85)
  UPDATE catalog_kpis SET current_value = 88.64 WHERE nombre = 'O2C — OTD (cumplimiento fecha promesa)';
  UPDATE catalog_kpis SET current_value = 98.75 WHERE nombre = 'O2C — Exactitud de facturación';
  UPDATE catalog_kpis SET current_value = 7.5 WHERE nombre = 'O2C — Rotación de cartera';

  -- Fuera de meta (< ~0.65)
  UPDATE catalog_kpis SET current_value = 16.5 WHERE nombre = 'O2C — Incidencias de calidad';
  UPDATE catalog_kpis SET current_value = 44.0 WHERE nombre = 'O2C — DSO';
  UPDATE catalog_kpis SET current_value = 84.0 WHERE nombre = 'O2C — Perfect order rate';

  -- Sin datos: sin línea base no hay cumplimiento (la app no asume valor por defecto útil)
  UPDATE catalog_kpis
  SET baseline = NULL, current_value = NULL
  WHERE nombre = 'O2C — NPS';

  RAISE NOTICE 'seed_catalog_kpi_semaforo_demo_mix: valores demo aplicados (3+3+3+1 en semáforo).';
END;
$$;


-- >>> FILE: 20260406120000_academy_progress.sql
-- =============================================================================
-- Academia O2C: progreso individual por usuario.
-- - Un registro por usuario (UNIQUE user_id).
-- - Persistencia de módulos, pasos y quizzes aprobados.
-- =============================================================================

CREATE TABLE academy_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_modules integer[] NOT NULL DEFAULT '{}',
  completed_steps text[] NOT NULL DEFAULT '{}',
  passed_quizzes integer[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_academy_progress_user_id ON academy_progress(user_id);

CREATE TRIGGER set_academy_progress_updated_at
  BEFORE UPDATE ON academy_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_progress_select_own ON academy_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY academy_progress_insert_own ON academy_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY academy_progress_update_own ON academy_progress
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE academy_progress IS 'Progreso de la Academia O2C por usuario autenticado.';
COMMENT ON COLUMN academy_progress.completed_modules IS 'IDs de módulos completados.';
COMMENT ON COLUMN academy_progress.completed_steps IS 'Pasos completados en formato moduleId-stepIndex o moduleId-exercise.';
COMMENT ON COLUMN academy_progress.passed_quizzes IS 'IDs de módulos con quiz aprobado al 100%.';


