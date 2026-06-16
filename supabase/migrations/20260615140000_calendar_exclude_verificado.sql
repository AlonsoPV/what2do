-- Calendario: conteos por día solo incluyen acciones activas (excluye Verificado siempre).
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
      AND a.estado::text <> 'Verificado'
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
