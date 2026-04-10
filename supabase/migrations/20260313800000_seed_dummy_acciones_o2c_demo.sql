-- =============================================================================
-- Demo: 10 acciones O2C dummy (desde 2026-04-01), fechas objetivo ≤ 30 días,
--       multi-gap y multi-KPI (puente + columnas primarias).
-- Requiere: seed O2C (gaps + catalog_kpis) y al menos un usuario en `usuarios`.
-- Idempotente: borra acciones cuyo título empieza por 'DEMO O2C ·' y reinserta.
-- =============================================================================

DO $$
DECLARE
  u_own   uuid;
  u_alt   uuid;
  g_ped   uuid;
  g_cum   uuid;
  g_fac   uuid;
  g_cob   uuid;
  g_ren   uuid;
  k_otif  uuid;
  k_otd   uuid;
  k_inci  uuid;
  k_ev_t0 uuid;
  k_exac  uuid;
  k_dso   uuid;
  k_rot   uuid;
  k_mar   uuid;
  k_nps   uuid;
  k_por   uuid;

  a1  uuid := 'f0e1c2d3-0001-4000-8000-000000000001';
  a2  uuid := 'f0e1c2d3-0002-4000-8000-000000000002';
  a3  uuid := 'f0e1c2d3-0003-4000-8000-000000000003';
  a4  uuid := 'f0e1c2d3-0004-4000-8000-000000000004';
  a5  uuid := 'f0e1c2d3-0005-4000-8000-000000000005';
  a6  uuid := 'f0e1c2d3-0006-4000-8000-000000000006';
  a7  uuid := 'f0e1c2d3-0007-4000-8000-000000000007';
  a8  uuid := 'f0e1c2d3-0008-4000-8000-000000000008';
  a9  uuid := 'f0e1c2d3-0009-4000-8000-000000000009';
  a10 uuid := 'f0e1c2d3-000a-4000-8000-00000000000a';
BEGIN
  SELECT id INTO u_own FROM usuarios ORDER BY created_at LIMIT 1;
  IF u_own IS NULL THEN
    RAISE NOTICE 'seed_dummy_acciones_o2c_demo: sin filas en usuarios; se omite.';
    RETURN;
  END IF;
  SELECT id INTO u_alt FROM usuarios ORDER BY created_at OFFSET 1 LIMIT 1;
  IF u_alt IS NULL THEN u_alt := u_own; END IF;

  SELECT id INTO g_ped FROM gaps WHERE nombre = 'O2C — Pedido y oferta' LIMIT 1;
  SELECT id INTO g_cum FROM gaps WHERE nombre = 'O2C — Cumplimiento y entrega' LIMIT 1;
  SELECT id INTO g_fac FROM gaps WHERE nombre = 'O2C — Facturación y registro' LIMIT 1;
  SELECT id INTO g_cob FROM gaps WHERE nombre = 'O2C — Cobranza y capital de trabajo' LIMIT 1;
  SELECT id INTO g_ren FROM gaps WHERE nombre = 'O2C — Rentabilidad y experiencia de cliente' LIMIT 1;

  IF g_ped IS NULL OR g_cum IS NULL THEN
    RAISE NOTICE 'seed_dummy_acciones_o2c_demo: gaps O2C no encontrados; se omite.';
    RETURN;
  END IF;

  SELECT id INTO k_otif FROM catalog_kpis WHERE nombre = 'O2C — OTIF' LIMIT 1;
  SELECT id INTO k_otd FROM catalog_kpis WHERE nombre = 'O2C — OTD (cumplimiento fecha promesa)' LIMIT 1;
  SELECT id INTO k_inci FROM catalog_kpis WHERE nombre = 'O2C — Incidencias de calidad' LIMIT 1;
  SELECT id INTO k_ev_t0 FROM catalog_kpis WHERE nombre = 'O2C — Evidencias T+0' LIMIT 1;
  SELECT id INTO k_exac FROM catalog_kpis WHERE nombre = 'O2C — Exactitud de facturación' LIMIT 1;
  SELECT id INTO k_dso FROM catalog_kpis WHERE nombre = 'O2C — DSO' LIMIT 1;
  SELECT id INTO k_rot FROM catalog_kpis WHERE nombre = 'O2C — Rotación de cartera' LIMIT 1;
  SELECT id INTO k_mar FROM catalog_kpis WHERE nombre = 'O2C — Margen bruto' LIMIT 1;
  SELECT id INTO k_nps FROM catalog_kpis WHERE nombre = 'O2C — NPS' LIMIT 1;
  SELECT id INTO k_por FROM catalog_kpis WHERE nombre = 'O2C — Perfect order rate' LIMIT 1;

  IF k_otif IS NULL THEN
    RAISE NOTICE 'seed_dummy_acciones_o2c_demo: catalog_kpis O2C no encontrados; se omite.';
    RETURN;
  END IF;

  DELETE FROM accion_catalog_kpis
  WHERE accion_id IN (SELECT id FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%');
  DELETE FROM accion_gaps
  WHERE accion_id IN (SELECT id FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%');
  DELETE FROM acciones_diarias WHERE titulo_accion LIKE 'DEMO O2C ·%';

  INSERT INTO acciones_diarias (
    id, fecha, titulo_accion, descripcion_accion, responsable, created_by,
    hora_limite, evidencia_esperada, evidencia_cargada, estado, prioridad,
    area, gap_id, catalog_kpi_id, story_points, created_at, updated_at
  ) VALUES
  (
    a1, DATE '2026-04-08',
    'DEMO O2C · Taller captura de pedido y checklist único',
    'Cómo: Facilitar taller de 90 min con comercial y planeación para mapear el flujo de pedido y oferta.' || E'\n\n' ||
    'Quiero: Un checklist único de 12 campos obligatorios antes de confirmar al cliente.' || E'\n\n' ||
    'Para qué: Mejorar NPS en pedido y perfect order rate sin re-trabajo en cumplimiento.',
    u_alt, u_own, TIME '10:30',
    'Acta del taller con checklist acordado y responsables por campo', false,
    'En_Ejecucion'::action_status, 'P1_Critica'::prioridad_nc,
    'Comercial', g_ped, k_nps, 8,
    TIMESTAMPTZ '2026-04-01 09:12:00+00', TIMESTAMPTZ '2026-04-01 09:12:00+00'
  ),
  (
    a2, DATE '2026-04-05',
    'DEMO O2C · Huddle OTIF/OTD con operaciones (15 min)',
    'Cómo: Instalar un huddle diario 15 min entre planeación y última milla con tablero compartido.' || E'\n\n' ||
    'Quiero: Compromiso explícito de fecha promesa y excepciones visibles el mismo día.' || E'\n\n' ||
    'Para qué: Subir OTIF y OTD sin aumentar incidencias de calidad.',
    u_own, u_own, TIME '07:45',
    'Captura de pantalla del tablero + notas del huddle (día actual)', false,
    'Hoy'::action_status, 'P1_Critica'::prioridad_nc,
    'Operaciones', g_cum, k_otif, 5,
    TIMESTAMPTZ '2026-04-01 10:05:00+00', TIMESTAMPTZ '2026-04-01 10:05:00+00'
  ),
  (
    a3, DATE '2026-04-12',
    'DEMO O2C · Piloto evidencia T+0 en facturación (2 cuentas)',
    'Cómo: Ejecutar piloto en dos cuentas clave con carga de evidencia el mismo día del cierre operativo.' || E'\n\n' ||
    'Quiero: Plantilla mínima de evidencia y trazabilidad en el sistema.' || E'\n\n' ||
    'Para qué: Subir Evidencias T+0 y Exactitud de facturación en el gap financiero.',
    u_alt, u_own, TIME '16:00',
    'ZIP con evidencias T+0 y conciliación vs pedido (piloto)', false,
    'Pendiente'::action_status, 'P2_Media'::prioridad_nc,
    'Finanzas', g_fac, k_ev_t0, 5,
    TIMESTAMPTZ '2026-04-01 11:40:00+00', TIMESTAMPTZ '2026-04-01 11:40:00+00'
  ),
  (
    a4, DATE '2026-04-18',
    'DEMO O2C · Playbook cobranza 30-60-90 y DSO por cartera',
    'Cómo: Diseñar playbook con pasos 30-60-90 días y responsables financieros/comercial.' || E'\n\n' ||
    'Quiero: Reglas de escalamiento y métricas semanales en un solo lugar.' || E'\n\n' ||
    'Para qué: Reducir DSO y mejorar rotación de cartera sin romper relación con cliente.',
    u_own, u_alt, TIME '14:15',
    'Documento del playbook v1 y lista de cuentas piloto firmada', false,
    'Bloqueado'::action_status, 'P1_Critica'::prioridad_nc,
    'Finanzas', g_cob, k_dso, 13,
    TIMESTAMPTZ '2026-04-01 13:22:00+00', TIMESTAMPTZ '2026-04-01 13:22:00+00'
  ),
  (
    a5, DATE '2026-04-22',
    'DEMO O2C · Tablero margen bruto por cuenta clave',
    'Cómo: Construir vista semanal de margen por cuenta con costos y descuentos auditables.' || E'\n\n' ||
    'Quiero: Alertas cuando el margen cae 2 pts vs plan en top 20 cuentas.' || E'\n\n' ||
    'Para qué: Sostener margen bruto y visibilidad para dirección.',
    u_alt, u_own, TIME '11:00',
    'Enlace al tablero + definición de umbrales acordados con finanzas', false,
    'Pendiente'::action_status, 'P2_Media'::prioridad_nc,
    'Dirección', g_ren, k_mar, 8,
    TIMESTAMPTZ '2026-04-01 14:08:00+00', TIMESTAMPTZ '2026-04-01 14:08:00+00'
  ),
  (
    a6, DATE '2026-04-06',
    'DEMO O2C · Cruce pedido–factura (exactitud + NPS)',
    'Cómo: Sesión conjunta comercial–finanzas para revisar 15 pedidos con mayor desvío de facturación.' || E'\n\n' ||
    'Quiero: Lista de causas raíz y corrección en catálogo de precios/cantidades.' || E'\n\n' ||
    'Para qué: Subir exactitud de facturación y experiencia (NPS) en el tramo pedido–cobro.',
    u_own, u_own, TIME '09:30',
    'Matriz de desvíos con acciones correctivas y dueños', false,
    'En_Ejecucion'::action_status, 'P2_Media'::prioridad_nc,
    'Comercial', g_ped, k_nps, 5,
    TIMESTAMPTZ '2026-04-01 15:55:00+00', TIMESTAMPTZ '2026-04-01 15:55:00+00'
  ),
  (
    a7, DATE '2026-04-14',
    'DEMO O2C · Puente OTIF–cartera (cumplimiento y cobranza)',
    'Cómo: Definir reglas cuando el retraso operativo afecta términos de pago y seguimiento de cobro.' || E'\n\n' ||
    'Quiero: Flujo único entre operaciones y cobranza con SLA de 48 h.' || E'\n\n' ||
    'Para qué: Alinear OTIF en entrega con DSO sin duplicar gestiones al cliente.',
    u_alt, u_alt, TIME '13:45',
    'Diagrama de flujo + acta con responsables de operaciones y finanzas', false,
    'Pendiente'::action_status, 'P1_Critica'::prioridad_nc,
    'Operaciones', g_cum, k_otif, 8,
    TIMESTAMPTZ '2026-04-01 16:30:00+00', TIMESTAMPTZ '2026-04-01 16:30:00+00'
  ),
  (
    a8, DATE '2026-04-25',
    'DEMO O2C · DSO por región: sprint de diagnóstico',
    'Cómo: Taller de 2 h con cada región para revisar cartera vencida y política de visitas.' || E'\n\n' ||
    'Quiero: Top 10 cuentas por región con plan de acción de 14 días.' || E'\n\n' ||
    'Para qué: Bajar DSO con foco en comportamiento real de cobro.',
    u_own, u_own, TIME '17:30',
    'Informe por región con DSO actual vs meta y riesgos', false,
    'Hoy'::action_status, 'P2_Media'::prioridad_nc,
    'Finanzas', g_cob, k_dso, 5,
    TIMESTAMPTZ '2026-04-01 17:10:00+00', TIMESTAMPTZ '2026-04-01 17:10:00+00'
  ),
  (
    a9, DATE '2026-04-03',
    'DEMO O2C · Plan reducción incidencias de calidad (30 días)',
    'Cómo: Analizar Pareto de incidencias en entrega y documentar contra-medidas en almacén y ruta.' || E'\n\n' ||
    'Quiero: Reducción medible de incidencias y refuerzo de OTIF en el mismo mes.' || E'\n\n' ||
    'Para qué: Mejorar cumplimiento y calidad percibida sin sacrificar velocidad.',
    u_alt, u_own, TIME '08:00',
    'Informe Pareto + plan 30 días con hitos semanales', true,
    'Hecho'::action_status, 'P2_Media'::prioridad_nc,
    'Operaciones', g_cum, k_inci, 13,
    TIMESTAMPTZ '2026-04-01 08:05:00+00', TIMESTAMPTZ '2026-04-02 09:00:00+00'
  ),
  (
    a10, DATE '2026-04-28',
    'DEMO O2C · Ciclo NPS + margen en cuenta estratégica',
    'Cómo: Diseñar encuesta corta post-entrega y cruzarla con margen de la cuenta en el mismo trimestre.' || E'\n\n' ||
    'Quiero: Una narrativa única para dirección: rentabilidad y voz del cliente.' || E'\n\n' ||
    'Para qué: Conectar rentabilidad y experiencia en el gap de dirección y pedido.',
    u_own, u_alt, TIME '12:15',
    'Presentación ejecutiva (PDF) con NPS, margen y acciones acordadas', false,
    'Verificado'::action_status, 'P3_Baja'::prioridad_nc,
    'Dirección', g_ren, k_nps, 3,
    TIMESTAMPTZ '2026-04-01 18:00:00+00', TIMESTAMPTZ '2026-04-03 10:00:00+00'
  );

  -- Puentes: múltiples gaps y KPIs por acción (primera fila = columnas en acciones_diarias ya puestas)
  INSERT INTO accion_gaps (accion_id, gap_id) VALUES
    (a1, g_ped), (a1, g_cum),
    (a2, g_cum),
    (a3, g_fac),
    (a4, g_cob),
    (a5, g_ren),
    (a6, g_ped), (a6, g_fac),
    (a7, g_cum), (a7, g_cob),
    (a8, g_cob),
    (a9, g_cum),
    (a10, g_ren), (a10, g_ped);

  INSERT INTO accion_catalog_kpis (accion_id, catalog_kpi_id) VALUES
    (a1, k_nps), (a1, k_por),
    (a2, k_otif), (a2, k_otd),
    (a3, k_ev_t0), (a3, k_exac),
    (a4, k_dso), (a4, k_rot),
    (a5, k_mar),
    (a6, k_nps), (a6, k_exac),
    (a7, k_otif), (a7, k_dso),
    (a8, k_dso),
    (a9, k_inci), (a9, k_otif),
    (a10, k_nps), (a10, k_mar);

  RAISE NOTICE 'seed_dummy_acciones_o2c_demo: insertadas 10 acciones DEMO O2C · (desde 2026-04-01).';
END;
$$;
