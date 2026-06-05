-- =============================================================================
-- Tickets de soporte / mejora
-- Abierto a usuarios autenticados: cada usuario ve sus tickets; super admin ve todo.
-- =============================================================================

CREATE TYPE ticket_status AS ENUM ('Nuevo', 'En proceso', 'Respuesta', 'Cerrado');

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo text NOT NULL,
  descripcion text NOT NULL,
  modulo text NOT NULL,
  tipo text NOT NULL,
  prioridad text NOT NULL DEFAULT 'media',
  impacto text,
  pasos_reproduccion text,
  resultado_esperado text,
  resultado_actual text,
  status ticket_status NOT NULL DEFAULT 'Nuevo',
  created_by uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  updated_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_support_tickets_titulo CHECK (char_length(trim(titulo)) >= 3),
  CONSTRAINT chk_support_tickets_descripcion CHECK (char_length(trim(descripcion)) >= 10)
);

CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE OR REPLACE FUNCTION can_manage_support_tickets()
RETURNS boolean AS $$
  SELECT public.is_super_admin() OR public.has_business_role('super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE support_ticket_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_support_ticket_comments_contenido CHECK (char_length(trim(contenido)) >= 1)
);

CREATE INDEX idx_support_ticket_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX idx_support_ticket_comments_created_at ON support_ticket_comments(created_at);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_select_creator_or_super_admin ON support_tickets
  FOR SELECT
  USING (created_by = get_my_usuario_id() OR can_manage_support_tickets());

CREATE POLICY support_tickets_insert_authenticated ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = get_my_usuario_id());

CREATE POLICY support_tickets_update_super_admin ON support_tickets
  FOR UPDATE
  USING (can_manage_support_tickets())
  WITH CHECK (can_manage_support_tickets());

CREATE POLICY support_tickets_delete_super_admin ON support_tickets
  FOR DELETE
  USING (can_manage_support_tickets());

CREATE POLICY support_ticket_comments_select_visible_ticket ON support_ticket_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = support_ticket_comments.ticket_id
        AND (t.created_by = get_my_usuario_id() OR can_manage_support_tickets())
    )
  );

CREATE POLICY support_ticket_comments_insert_visible_ticket ON support_ticket_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = support_ticket_comments.ticket_id
        AND (t.created_by = get_my_usuario_id() OR can_manage_support_tickets())
    )
  );

CREATE POLICY support_ticket_comments_update_author_or_super_admin ON support_ticket_comments
  FOR UPDATE
  USING (created_by = get_my_usuario_id() OR can_manage_support_tickets());

CREATE POLICY support_ticket_comments_delete_super_admin ON support_ticket_comments
  FOR DELETE
  USING (can_manage_support_tickets());

INSERT INTO dropdown_catalogs (key, nombre, descripcion, activo)
VALUES
  ('ticket_modulos', 'Modulos para tickets', 'Modulos disponibles para clasificar tickets de soporte.', true),
  ('ticket_tipos', 'Tipos de ticket', 'Clasificacion base de tickets.', true),
  ('ticket_prioridades', 'Prioridades de ticket', 'Urgencia sugerida por el usuario.', true),
  ('ticket_impactos', 'Impactos de ticket', 'Nivel de afectacion operativa.', true)
ON CONFLICT (key) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  activo = true;

WITH catalog AS (
  SELECT id, key FROM dropdown_catalogs
  WHERE key IN ('ticket_modulos', 'ticket_tipos', 'ticket_prioridades', 'ticket_impactos')
)
INSERT INTO dropdown_options (catalog_id, label, value, orden, activo)
SELECT catalog.id, seed.label, seed.value, seed.orden, true
FROM catalog
JOIN (
  VALUES
    ('ticket_modulos', 'Dashboard', 'dashboard', 10),
    ('ticket_modulos', 'Kanban', 'kanban', 20),
    ('ticket_modulos', 'Academia', 'academia', 30),
    ('ticket_modulos', 'Disciplina', 'disciplina', 40),
    ('ticket_modulos', 'Calendario', 'calendario', 50),
    ('ticket_modulos', 'Notificaciones', 'notificaciones', 60),
    ('ticket_modulos', 'Manual', 'manual', 70),
    ('ticket_modulos', 'Perfil', 'perfil', 80),
    ('ticket_modulos', 'Tickets', 'tickets', 90),
    ('ticket_tipos', 'Mejora', 'mejora', 10),
    ('ticket_tipos', 'Error', 'error', 20),
    ('ticket_tipos', 'Cambio', 'cambio', 30),
    ('ticket_prioridades', 'Baja', 'baja', 10),
    ('ticket_prioridades', 'Media', 'media', 20),
    ('ticket_prioridades', 'Alta', 'alta', 30),
    ('ticket_prioridades', 'Urgente', 'urgente', 40),
    ('ticket_impactos', 'Individual', 'individual', 10),
    ('ticket_impactos', 'Equipo', 'equipo', 20),
    ('ticket_impactos', 'Operacion', 'operacion', 30)
) AS seed(key, label, value, orden) ON seed.key = catalog.key
WHERE NOT EXISTS (
  SELECT 1
  FROM dropdown_options existing
  WHERE existing.catalog_id = catalog.id
    AND lower(trim(existing.value)) = lower(trim(seed.value))
);

COMMENT ON TABLE support_tickets IS 'Tickets creados por usuarios; super admin puede ver, editar y borrar todos.';
COMMENT ON TABLE support_ticket_comments IS 'Comentarios vinculados a tickets.';
