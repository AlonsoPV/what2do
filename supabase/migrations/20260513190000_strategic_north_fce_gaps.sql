-- =============================================================================
-- Mapa estratégico — Fase 1: norte estratégico (BHAG), FCE y vínculo gaps → FCE.
-- Idempotente en datos: INSERT strategic_north solo si está vacío; FCE upsert por codigo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

CREATE TABLE public.strategic_north (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mision text NOT NULL,
  vision text NOT NULL,
  valores text,
  bhag text NOT NULL,
  bhag_anio integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_strategic_north_bhag_anio CHECK (bhag_anio >= 2000 AND bhag_anio <= 2100)
);

COMMENT ON TABLE public.strategic_north IS
  'Nivel 1 del mapa estratégico: misión, visión, valores y BHAG (configurable).';

CREATE TRIGGER set_strategic_north_updated_at
  BEFORE UPDATE ON public.strategic_north
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fce (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  icono text,
  orden integer NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fce_codigo UNIQUE (codigo),
  CONSTRAINT uq_fce_orden UNIQUE (orden),
  CONSTRAINT chk_fce_codigo_trim CHECK (char_length(trim(codigo)) >= 3),
  CONSTRAINT chk_fce_orden_positive CHECK (orden >= 1 AND orden <= 99)
);

COMMENT ON TABLE public.fce IS 'Nivel 2: factores críticos de éxito (FCE).';

CREATE INDEX idx_fce_activo_orden ON public.fce (activo, orden);

CREATE TRIGGER set_fce_updated_at
  BEFORE UPDATE ON public.fce
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gaps
  ADD COLUMN IF NOT EXISTS fce_id uuid REFERENCES public.fce(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gaps_fce_id ON public.gaps(fce_id);

COMMENT ON COLUMN public.gaps.fce_id IS 'FCE que ancla la brecha en el mapa estratégico (Nivel 2).';

-- -----------------------------------------------------------------------------
-- RLS (alineado a gaps / catalog_kpis)
-- -----------------------------------------------------------------------------

ALTER TABLE public.strategic_north ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategic_north_select_authenticated ON public.strategic_north
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY strategic_north_insert_admin ON public.strategic_north
  FOR INSERT WITH CHECK (public.is_app_admin());

CREATE POLICY strategic_north_update_admin ON public.strategic_north
  FOR UPDATE USING (public.is_app_admin());

CREATE POLICY strategic_north_delete_admin ON public.strategic_north
  FOR DELETE USING (public.is_app_admin());

ALTER TABLE public.fce ENABLE ROW LEVEL SECURITY;

CREATE POLICY fce_select_authenticated ON public.fce
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY fce_insert_admin ON public.fce
  FOR INSERT WITH CHECK (public.is_app_admin());

CREATE POLICY fce_update_admin ON public.fce
  FOR UPDATE USING (public.is_app_admin());

CREATE POLICY fce_delete_admin ON public.fce
  FOR DELETE USING (public.is_app_admin());

-- -----------------------------------------------------------------------------
-- Seed: norte + 8 FCE (Lucide icon names consumidos por la app)
-- -----------------------------------------------------------------------------

INSERT INTO public.strategic_north (mision, vision, valores, bhag, bhag_anio)
SELECT
  'Por amor a México, llevamos cada medicamento con seguridad, puntualidad y excelencia, convencidos de que en cada envío realmente transportamos salud.',
  'Ser la mejor empresa de logística farmacéutica en México, uniendo innovación, excelencia y humanidad para asegurar que cada entrega proteja la salud de cada paciente.',
  'La misión eleva el servicio más allá de la logística: transportar salud implica urgencia y responsabilidad en cada envío.' || E'\n'
    || 'Innovación, excelencia y humanidad articulan la ventaja competitiva (visión).' || E'\n'
    || 'Desglose del BHAG: (1) Mayor confiabilidad operativa y financiera — socio predecible y estable para clientes y accionistas.' || E'\n'
    || '(2) Entregas perfectas y cumplimiento regulatorio en tiempo real — estándar de oro en calidad y seguridad; conformidad integrada en vivo en cada etapa.' || E'\n'
    || '(3) Decisiones basadas en datos — gestión proactiva y objetiva donde los datos en tiempo real informan decisiones operativas y estratégicas.',
  'Ser la empresa de logística farmacéutica en México con mayor confiabilidad operativa y financiera, reconocida por entregas perfectas, cumplimiento regulatorio en tiempo real y decisiones basadas en datos.',
  2030
WHERE NOT EXISTS (SELECT 1 FROM public.strategic_north LIMIT 1);

INSERT INTO public.fce (codigo, nombre, descripcion, icono, orden, activo)
VALUES
  (
    'FCE-1',
    'Entrega perfecta digital',
    'PODs en tiempo, evidencias digitales y monitoreo confiable.',
    'Package',
    1,
    true
  ),
  (
    'FCE-2',
    'Calidad viva integrada',
    'Temperatura y evidencias íntegras en toda la cadena.',
    'Thermometer',
    2,
    true
  ),
  (
    'FCE-3',
    'Caja sin fricción O2C',
    'Carta Porte, viáticos y ciclo entrega→cobro sin trabas.',
    'Landmark',
    3,
    true
  ),
  (
    'FCE-4',
    'Decisiones en tiempo real',
    'CTS / datos financieros y tableros operativos accionables.',
    'Activity',
    4,
    true
  ),
  (
    'FCE-5',
    'Cultura de ejecución',
    'Planeación y disciplina operativa día a día.',
    'Zap',
    5,
    true
  ),
  (
    'FCE-6',
    'Capital humano calificado',
    'Onboarding, roles claros y desarrollo del equipo.',
    'Users',
    6,
    true
  ),
  (
    'FCE-7',
    'Riesgo y ciberseguridad',
    'Continuidad, seguridad de información y cumplimiento.',
    'ShieldAlert',
    7,
    true
  ),
  (
    'FCE-8',
    'Operación segura ISO 45001',
    'Seguridad industrial y mantenimiento preventivo.',
    'ShieldCheck',
    8,
    true
  )
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  orden = EXCLUDED.orden,
  activo = EXCLUDED.activo;

-- -----------------------------------------------------------------------------
-- Vincular gaps catálogo KPIs.md (GAP-MD-*) — solo si existen filas coincidentes
-- -----------------------------------------------------------------------------

UPDATE public.gaps g
SET fce_id = f.id
FROM public.fce f
WHERE f.codigo = 'FCE-1'
  AND g.fce_id IS NULL
  AND (g.nombre LIKE 'GAP-MD-03%' OR g.nombre LIKE 'GAP-MD-04%');

UPDATE public.gaps g
SET fce_id = f.id
FROM public.fce f
WHERE f.codigo = 'FCE-2'
  AND g.fce_id IS NULL
  AND g.nombre LIKE 'GAP-MD-05%';

UPDATE public.gaps g
SET fce_id = f.id
FROM public.fce f
WHERE f.codigo = 'FCE-3'
  AND g.fce_id IS NULL
  AND (g.nombre LIKE 'GAP-MD-02%' OR g.nombre LIKE 'GAP-MD-06%' OR g.nombre LIKE 'GAP-MD-07%');

UPDATE public.gaps g
SET fce_id = f.id
FROM public.fce f
WHERE f.codigo = 'FCE-4'
  AND g.fce_id IS NULL
  AND (g.nombre LIKE 'GAP-MD-08%' OR g.nombre LIKE 'GAP-MD-10%');

UPDATE public.gaps g
SET fce_id = f.id
FROM public.fce f
WHERE f.codigo = 'FCE-5'
  AND g.fce_id IS NULL
  AND g.nombre LIKE 'GAP-MD-01%';

UPDATE public.gaps g
SET fce_id = f.id
FROM public.fce f
WHERE f.codigo = 'FCE-8'
  AND g.fce_id IS NULL
  AND g.nombre LIKE 'GAP-MD-09%';
