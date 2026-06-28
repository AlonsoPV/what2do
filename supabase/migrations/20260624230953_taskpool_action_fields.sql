-- Taskpool: campos adicionales para vista tipo tabla Excel sobre acciones.
ALTER TABLE public.acciones_diarias
  ADD COLUMN IF NOT EXISTS no_actividad text,
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS instrucciones_especificas text,
  ADD COLUMN IF NOT EXISTS objetivo text;

COMMENT ON COLUMN public.acciones_diarias.no_actividad IS
  'Folio o consecutivo visible en taskpool.';
COMMENT ON COLUMN public.acciones_diarias.fecha_inicio IS
  'Fecha de inicio de la actividad para taskpool.';
COMMENT ON COLUMN public.acciones_diarias.instrucciones_especificas IS
  'Instrucciones especificas de ejecucion de la actividad.';
COMMENT ON COLUMN public.acciones_diarias.objetivo IS
  'Objetivo o resultado esperado de la actividad.';

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_fecha_inicio
  ON public.acciones_diarias (fecha_inicio);

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_no_actividad
  ON public.acciones_diarias (no_actividad);
