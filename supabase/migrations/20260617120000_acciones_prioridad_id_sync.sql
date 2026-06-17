-- Vincula acciones_diarias.prioridad al catálogo priorities por ID y sincroniza el texto al renombrar.

-- 0) Quitar trigger que bloquea ALTER TYPE en prioridad (re-ejecución idempotente).
DROP TRIGGER IF EXISTS acciones_diarias_sync_prioridad_id ON public.acciones_diarias;

-- 1) Asegurar tipo text (algunos entornos aún tienen enum prioridad_nc).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'acciones_diarias'
      AND a.attname = 'prioridad'
      AND NOT a.attisdropped
      AND t.typname = 'prioridad_nc'
  ) THEN
    ALTER TABLE public.acciones_diarias
      ALTER COLUMN prioridad DROP DEFAULT;

    ALTER TABLE public.acciones_diarias
      ALTER COLUMN prioridad TYPE text USING prioridad::text;

    ALTER TABLE public.acciones_diarias
      ALTER COLUMN prioridad SET DEFAULT 'P2_Media';

    ALTER TABLE public.acciones_diarias
      ALTER COLUMN prioridad SET NOT NULL;
  END IF;
END $$;
-- 2) Columna prioridad_id (idempotente; sin FK primero por si priorities no existe aún).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acciones_diarias'
      AND column_name = 'prioridad_id'
  ) THEN
    ALTER TABLE public.acciones_diarias
      ADD COLUMN prioridad_id uuid;
  END IF;
END $$;

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
COMMENT ON COLUMN public.acciones_diarias.prioridad_id IS
  'FK al catálogo priorities; fuente de verdad para nombre/color al editar el catálogo.';

-- Backfill por nombre (case-insensitive).
UPDATE public.acciones_diarias ad
SET prioridad_id = p.id
FROM public.priorities p
WHERE ad.prioridad_id IS NULL
  AND lower(trim(ad.prioridad)) = lower(trim(p.nombre));

-- Alinear texto con el catálogo cuando ya hay ID.
UPDATE public.acciones_diarias ad
SET prioridad = p.nombre
FROM public.priorities p
WHERE ad.prioridad_id = p.id
  AND ad.prioridad IS DISTINCT FROM p.nombre;

CREATE OR REPLACE FUNCTION public.acciones_diarias_sync_prioridad_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_id uuid;
  resolved_nombre text;
BEGIN
  IF NEW.prioridad_id IS NOT NULL THEN
    SELECT nombre INTO resolved_nombre
    FROM public.priorities
    WHERE id = NEW.prioridad_id;

    IF resolved_nombre IS NOT NULL THEN
      NEW.prioridad := resolved_nombre;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.prioridad IS NOT NULL AND btrim(NEW.prioridad::text) <> '' THEN
    SELECT id, nombre
    INTO resolved_id, resolved_nombre
    FROM public.priorities
    WHERE lower(trim(nombre)) = lower(trim(NEW.prioridad::text))
    ORDER BY activo DESC, orden ASC
    LIMIT 1;

    IF resolved_id IS NOT NULL THEN
      NEW.prioridad_id := resolved_id;
      NEW.prioridad := resolved_nombre;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acciones_diarias_sync_prioridad_id ON public.acciones_diarias;
CREATE TRIGGER acciones_diarias_sync_prioridad_id  BEFORE INSERT OR UPDATE OF prioridad, prioridad_id ON public.acciones_diarias
  FOR EACH ROW
  EXECUTE FUNCTION public.acciones_diarias_sync_prioridad_id();

CREATE OR REPLACE FUNCTION public.priorities_sync_acciones_on_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    UPDATE public.acciones_diarias
    SET
      prioridad = NEW.nombre,
      prioridad_id = NEW.id,
      updated_at = now()
    WHERE prioridad_id = OLD.id
       OR lower(trim(prioridad::text)) = lower(trim(OLD.nombre));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS priorities_sync_acciones_on_rename ON public.priorities;
CREATE TRIGGER priorities_sync_acciones_on_rename
  AFTER UPDATE OF nombre ON public.priorities
  FOR EACH ROW
  EXECUTE FUNCTION public.priorities_sync_acciones_on_rename();

-- Reparación manual / post-actualización de catálogo (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.sync_acciones_prioridad_for_priority(p_priority_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_nombre text;
  updated_count integer;
BEGIN
  SELECT nombre INTO p_nombre
  FROM public.priorities
  WHERE id = p_priority_id;

  IF p_nombre IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.acciones_diarias
  SET
    prioridad = p_nombre,
    prioridad_id = p_priority_id,
    updated_at = now()
  WHERE prioridad_id = p_priority_id
     OR lower(trim(prioridad::text)) = lower(trim(p_nombre));

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_acciones_prioridad_for_priority(uuid) TO authenticated;

-- Reparación puntual tras renombres hechos antes del trigger (admin en SQL editor).
CREATE OR REPLACE FUNCTION public.repair_acciones_prioridad_rename(
  p_old_nombre text,
  p_priority_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_nombre text;
  updated_count integer;
BEGIN
  SELECT nombre INTO p_nombre
  FROM public.priorities
  WHERE id = p_priority_id;

  IF p_nombre IS NULL OR p_old_nombre IS NULL OR btrim(p_old_nombre) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.acciones_diarias
  SET
    prioridad = p_nombre,
    prioridad_id = p_priority_id,
    updated_at = now()
  WHERE lower(trim(prioridad::text)) = lower(trim(p_old_nombre));

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_acciones_prioridad_rename(text, uuid) TO authenticated;
