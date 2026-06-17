-- Ejecutar en Supabase SQL Editor si la app falla con:
-- column acciones_diarias.prioridad_id does not exist

ALTER TABLE public.acciones_diarias
  ADD COLUMN IF NOT EXISTS prioridad_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'priorities'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acciones_diarias_prioridad_id_fkey'
  ) THEN
    ALTER TABLE public.acciones_diarias
      ADD CONSTRAINT acciones_diarias_prioridad_id_fkey
      FOREIGN KEY (prioridad_id) REFERENCES public.priorities(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acciones_diarias_prioridad_id
  ON public.acciones_diarias (prioridad_id);

UPDATE public.acciones_diarias ad
SET prioridad_id = p.id
FROM public.priorities p
WHERE ad.prioridad_id IS NULL
  AND lower(trim(ad.prioridad::text)) = lower(trim(p.nombre));
