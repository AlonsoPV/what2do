-- =============================================================================
-- Norte estratégico — formulación farmacéutica (misión, visión, valores, BHAG).
-- Solo actualiza si existe public.strategic_north (tabla y seed base en migración
-- 20260513190000_strategic_north_fce_gaps.sql). Sin tabla: NOTICE y sin error.
-- =============================================================================

DO $guard$
BEGIN
  IF to_regclass('public.strategic_north') IS NOT NULL THEN
    UPDATE public.strategic_north AS sn
    SET
      mision = v.mision,
      vision = v.vision,
      valores = v.valores,
      bhag = v.bhag,
      bhag_anio = v.bhag_anio,
      updated_at = now()
    FROM (
      SELECT
        'Por amor a México, llevamos cada medicamento con seguridad, puntualidad y excelencia, convencidos de que en cada envío realmente transportamos salud.'::text AS mision,
        'Ser la mejor empresa de logística farmacéutica en México, uniendo innovación, excelencia y humanidad para asegurar que cada entrega proteja la salud de cada paciente.'::text AS vision,
        (
          'La misión eleva el servicio más allá de la logística: transportar salud implica urgencia y responsabilidad en cada envío.'
          || E'\n'
          || 'Innovación, excelencia y humanidad articulan la ventaja competitiva (visión).'
          || E'\n'
          || 'Desglose del BHAG: (1) Mayor confiabilidad operativa y financiera — socio predecible y estable para clientes y accionistas.'
          || E'\n'
          || '(2) Entregas perfectas y cumplimiento regulatorio en tiempo real — estándar de oro en calidad y seguridad; conformidad integrada en vivo en cada etapa.'
          || E'\n'
          || '(3) Decisiones basadas en datos — gestión proactiva y objetiva donde los datos en tiempo real informan decisiones operativas y estratégicas.'
        )::text AS valores,
        'Ser la empresa de logística farmacéutica en México con mayor confiabilidad operativa y financiera, reconocida por entregas perfectas, cumplimiento regulatorio en tiempo real y decisiones basadas en datos.'::text AS bhag,
        2030 AS bhag_anio
    ) AS v
    WHERE sn.id IN (
      SELECT id FROM public.strategic_north ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 1
    );
  ELSE
    RAISE NOTICE 'strategic_north_pharma_seed_update: omitido — tabla public.strategic_north no existe. Ejecuta primero 20260513190000_strategic_north_fce_gaps.sql o supabase db push desde el proyecto.';
  END IF;
END $guard$;
