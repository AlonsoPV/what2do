-- =============================================================================
-- Evolución del score global — snapshots (0–1 en BD, 0–100% en UI)
--
-- Serie temporal desde `global_score_snapshots`. La app lee hasta ~90 puntos
-- y dibuja la gráfica. Sin filas → mensaje: batch / cierre de día.
--
-- Origen de datos típico:
-- - Medición KPI catálogo (admin) → la app puede insertar un snapshot.
-- - Cierre de día o job batch → llamar `record_global_score_snapshot` con el
--   score ya calculado (misma lógica O2C que el dashboard), o INSERT con
--   service_role (bypass RLS).
--
-- Requisito: migración `20260313500000_gaps_o2c_kpis.sql` (o este script
-- idempotente) y función `is_app_admin()` del esquema base.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla (idempotente)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.global_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score numeric NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_global_score_snapshots_score_range CHECK (score >= 0::numeric AND score <= 1::numeric)
);

CREATE INDEX IF NOT EXISTS idx_global_score_snapshots_created_at
  ON public.global_score_snapshots (created_at DESC);

COMMENT ON TABLE public.global_score_snapshots IS
  'Snapshots del score global O2C (0–1). Alimenta la gráfica “Evolución del score global”.';

-- -----------------------------------------------------------------------------
-- RLS (idempotente)
-- -----------------------------------------------------------------------------

ALTER TABLE public.global_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS global_score_snapshots_select_authenticated ON public.global_score_snapshots;
CREATE POLICY global_score_snapshots_select_authenticated ON public.global_score_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS global_score_snapshots_insert_admin ON public.global_score_snapshots;
CREATE POLICY global_score_snapshots_insert_admin ON public.global_score_snapshots
  FOR INSERT WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS global_score_snapshots_update_admin ON public.global_score_snapshots;
CREATE POLICY global_score_snapshots_update_admin ON public.global_score_snapshots
  FOR UPDATE USING (is_app_admin());

DROP POLICY IF EXISTS global_score_snapshots_delete_admin ON public.global_score_snapshots;
CREATE POLICY global_score_snapshots_delete_admin ON public.global_score_snapshots
  FOR DELETE USING (is_app_admin());

-- -----------------------------------------------------------------------------
-- RPC para batch / cierre de día (Edge Function, cron o SQL manual como postgres)
-- Calcula el score FUERA de esta función (app, script, etc.); aquí solo se persiste.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_global_score_snapshot(
  p_score numeric,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v numeric;
  v_id uuid;
BEGIN
  v := LEAST(1::numeric, GREATEST(0::numeric, COALESCE(p_score, 0::numeric)));
  INSERT INTO public.global_score_snapshots (score, metadata)
  VALUES (
    v,
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('recorded_at', to_jsonb(now()))
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.record_global_score_snapshot(numeric, jsonb) IS
  'Inserta un snapshot del score global (0–1). Pensado para batch/cierre; ejecutar con rol que tenga permiso.';

REVOKE ALL ON FUNCTION public.record_global_score_snapshot(numeric, jsonb) FROM PUBLIC;

-- Edge Functions / backend con service_role:
GRANT EXECUTE ON FUNCTION public.record_global_score_snapshot(numeric, jsonb) TO service_role;

-- Opcional: permitir a postgres/supabase_admin desde SQL Editor sin JWT
GRANT EXECUTE ON FUNCTION public.record_global_score_snapshot(numeric, jsonb) TO postgres;

-- -----------------------------------------------------------------------------
-- Ejemplos (ejecutar aparte según necesidad)
-- -----------------------------------------------------------------------------

-- 1) Probar la serie en la UI (score 72.5% → 0.725):
-- SELECT public.record_global_score_snapshot(
--   0.725,
--   jsonb_build_object('source', 'manual_test', 'label', 'demo evolución')
-- );

-- 2) Insert directo (mismo resultado; requiere ser admin en sesión o service_role vía API):
-- INSERT INTO public.global_score_snapshots (score, metadata)
-- VALUES (0.65, jsonb_build_object('source', 'batch', 'job', 'nightly_o2c'));

-- 3) Ver últimos puntos (0–100 %):
-- SELECT id,
--        round((score * 100)::numeric, 2) AS score_pct,
--        metadata,
--        created_at
-- FROM public.global_score_snapshots
-- ORDER BY created_at DESC
-- LIMIT 30;

-- 4) pg_cron (si está habilitado en el proyecto): ejemplo 23:00 UTC diario
--    (ajustar expresión y llamada; el score debe obtenerse de tu pipeline):
-- SELECT cron.schedule(
--   'global-score-snapshot-daily',
--   '0 23 * * *',
--   $$ SELECT public.record_global_score_snapshot(0.0::numeric, '{"source":"cron_placeholder"}'::jsonb) $$
-- );
