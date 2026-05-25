-- =============================================================================
-- RUN/CHANGE: acciones operativas vs acciones de sprint/estrategicas.
-- =============================================================================

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS kpi_id uuid REFERENCES public.catalog_kpis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gap_id uuid REFERENCES public.gaps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsable_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.acciones_diarias
  ALTER COLUMN tipo_accion TYPE text
  USING CASE
    WHEN tipo_accion::text IN ('sprint', 'estrategica', 'operativa') THEN tipo_accion::text
    ELSE 'operativa'
  END;

UPDATE public.acciones_diarias
SET tipo_accion = 'operativa'
WHERE tipo_accion IS NULL
   OR tipo_accion NOT IN ('operativa', 'sprint', 'estrategica');

UPDATE public.acciones_diarias
SET sprint_id = NULL
WHERE tipo_accion = 'operativa';

ALTER TABLE public.acciones_diarias
  ALTER COLUMN tipo_accion SET DEFAULT 'operativa',
  ALTER COLUMN tipo_accion SET NOT NULL;

ALTER TABLE public.acciones_diarias
  DROP CONSTRAINT IF EXISTS chk_acciones_tipo_accion_run_change,
  ADD CONSTRAINT chk_acciones_tipo_accion_run_change
    CHECK (tipo_accion IN ('operativa', 'sprint', 'estrategica'));

ALTER TABLE public.acciones_diarias
  DROP CONSTRAINT IF EXISTS chk_acciones_sprint_requires_sprint_id,
  ADD CONSTRAINT chk_acciones_sprint_requires_sprint_id
    CHECK (tipo_accion <> 'sprint' OR sprint_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_acciones_tipo_accion
  ON public.acciones_diarias(tipo_accion);

CREATE INDEX IF NOT EXISTS idx_sprints_kpi
  ON public.sprints(kpi_id)
  WHERE kpi_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sprints_gap
  ON public.sprints(gap_id)
  WHERE gap_id IS NOT NULL;

COMMENT ON COLUMN public.acciones_diarias.tipo_accion IS
  'RUN/CHANGE: operativa = trabajo diario; sprint = cambio temporal con sprint obligatorio; estrategica = iniciativa mayor con sprint opcional.';

COMMENT ON COLUMN public.acciones_diarias.sprint_id IS
  'Sprint asociado. Obligatorio solo cuando tipo_accion = sprint.';
