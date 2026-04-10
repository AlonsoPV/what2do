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
