-- Performance audit: indexes for high-traffic loading paths.
-- Safe to run repeatedly; each index is guarded with IF NOT EXISTS.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_fecha_hora
  ON public.acciones_diarias(fecha, hora_limite);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_fecha_estado_hora
  ON public.acciones_diarias(fecha, estado, hora_limite);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_responsable_fecha
  ON public.acciones_diarias(responsable, fecha);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_created_by_fecha
  ON public.acciones_diarias(created_by, fecha);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_area_fecha
  ON public.acciones_diarias(area, fecha);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_created_at
  ON public.acciones_diarias(created_at);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_titulo_trgm
  ON public.acciones_diarias
  USING gin (titulo_accion gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_descripcion_trgm
  ON public.acciones_diarias
  USING gin (descripcion_accion gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_evidencia_trgm
  ON public.acciones_diarias
  USING gin (evidencia_esperada gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_accion_comentarios_accion_created
  ON public.accion_comentarios(accion_id, created_at);

CREATE INDEX IF NOT EXISTS idx_accion_comentarios_asignado
  ON public.accion_comentarios(asignado)
  WHERE asignado IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accion_comentarios_etiquetas_gin
  ON public.accion_comentarios
  USING gin (etiquetas);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leido_created
  ON public.notificaciones(usuario_id, leido, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_created
  ON public.notificaciones(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_titulo_trgm
  ON public.support_tickets
  USING gin (titulo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_support_tickets_descripcion_trgm
  ON public.support_tickets
  USING gin (descripcion gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_support_tickets_modulo_trgm
  ON public.support_tickets
  USING gin (modulo gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.calendar_action_counts_by_day(
  p_usuario_id uuid,
  p_from date,
  p_to date,
  p_area text DEFAULT NULL,
  p_responsable uuid DEFAULT NULL,
  p_estado text DEFAULT NULL
)
RETURNS TABLE(day date, action_count integer)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH visible_actions AS (
    SELECT
      a.id,
      GREATEST((a.created_at AT TIME ZONE 'America/Mexico_City')::date, p_from) AS visible_from
    FROM public.acciones_diarias a
    WHERE (a.created_at AT TIME ZONE 'America/Mexico_City')::date <= p_to
      AND (p_estado IS NOT NULL OR a.estado::text <> 'Verificado')
      AND (p_estado IS NULL OR a.estado::text = p_estado)
      AND (p_area IS NULL OR a.area = p_area)
      AND (p_responsable IS NULL OR a.responsable = p_responsable)
      AND (
        a.created_by = p_usuario_id
        OR a.responsable = p_usuario_id
        OR EXISTS (
          SELECT 1
          FROM public.accion_comentarios c
          WHERE c.accion_id = a.id
            AND (
              c.asignado = p_usuario_id
              OR c.etiquetas @> ARRAY[p_usuario_id::text]::text[]
            )
        )
      )
  ),
  expanded AS (
    SELECT gs.day::date
    FROM visible_actions va
    CROSS JOIN LATERAL generate_series(va.visible_from, p_to, interval '1 day') AS gs(day)
  )
  SELECT expanded.day, COUNT(*)::integer AS action_count
  FROM expanded
  GROUP BY expanded.day
  ORDER BY expanded.day;
$$;
