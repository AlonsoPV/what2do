-- =============================================================================
-- QA seed: 8 acciones variadas para filtros, checks y validaciones.
-- Usuarios objetivo:
--   Jorge Gonzalez, Gerardo Puga, Leslie, Damaris, Nancy Rojo, Abraham, Antonio.
--
-- Idempotente: borra acciones cuyo titulo empieza por 'QA FILTROS - ' y reinserta.
-- Si los usuarios o catalogos O2C no existen en el entorno, se omite con NOTICE.
-- =============================================================================

DO $$
DECLARE
  u_jorge   uuid;
  u_gerardo uuid;
  u_leslie  uuid;
  u_damaris uuid;
  u_nancy   uuid;
  u_abraham uuid;
  u_antonio uuid;

  sprint_qa uuid := 'a8a10000-0608-4000-8000-000000000001';

  g_ped uuid;
  g_cum uuid;
  g_fac uuid;
  g_cob uuid;
  g_ren uuid;

  k_otif uuid;
  k_ev_t0 uuid;
  k_exac uuid;
  k_dso uuid;
  k_mar uuid;
  k_nps uuid;
  k_por uuid;

  a1 uuid := 'a8a10000-0608-4000-8000-000000000101';
  a2 uuid := 'a8a10000-0608-4000-8000-000000000102';
  a3 uuid := 'a8a10000-0608-4000-8000-000000000103';
  a4 uuid := 'a8a10000-0608-4000-8000-000000000104';
  a5 uuid := 'a8a10000-0608-4000-8000-000000000105';
  a6 uuid := 'a8a10000-0608-4000-8000-000000000106';
  a7 uuid := 'a8a10000-0608-4000-8000-000000000107';
  a8 uuid := 'a8a10000-0608-4000-8000-000000000108';
BEGIN
  SELECT u.id INTO u_jorge
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('jorge.gonzalez@envialomexico.com', 'jorgegonzalez@emx.mx')
     OR u.user_id = '7e16053e-a2ae-44a6-b9ed-3966754cd5b7'::uuid
  LIMIT 1;

  SELECT u.id INTO u_gerardo
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('g.puga@nbio.mx', 'gerardopuga@emx.mx')
     OR u.user_id = '0af758ca-779f-44d1-815c-a8916917cf67'::uuid
  LIMIT 1;

  SELECT u.id INTO u_leslie
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('l.diaz@nbio.mx', 'leslie@emx.mx')
     OR u.user_id = '848bbe04-0115-41d4-b9b2-8e8c2cfee6dc'::uuid
  LIMIT 1;

  SELECT u.id INTO u_damaris
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('reclutamiento2@nbio.mx', 'damaris@emx.mx')
     OR u.user_id = '14afe802-8187-4db5-a13b-37c01adba157'::uuid
  LIMIT 1;

  SELECT u.id INTO u_nancy
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('nancy.rojo@envialomexico.com', 'nancyrojo@emx.mx')
     OR u.user_id = '50819182-cb32-46e3-b11a-7bd28d3e3e3b'::uuid
  LIMIT 1;

  SELECT u.id INTO u_abraham
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('e.mendez@nbio.mx', 'abraham@emx.mx')
     OR u.user_id = '317465b7-f009-4635-9a27-a05d14c7c619'::uuid
  LIMIT 1;

  SELECT u.id INTO u_antonio
  FROM public.usuarios u
  JOIN auth.users au ON au.id = u.user_id
  WHERE lower(trim(au.email)) IN ('j.mejia@nbio.mx', 'antonio@nbio.mx')
     OR u.user_id = '10e80eb8-7ec5-4dfb-98dd-11e37866d762'::uuid
  LIMIT 1;

  IF u_jorge IS NULL OR u_gerardo IS NULL OR u_leslie IS NULL OR u_damaris IS NULL
     OR u_nancy IS NULL OR u_abraham IS NULL OR u_antonio IS NULL THEN
    RAISE NOTICE 'seed_qa_acciones_usuarios_filtros: faltan usuarios objetivo; se omite.';
    RETURN;
  END IF;

  SELECT id INTO g_ped FROM public.gaps WHERE lower(nombre) LIKE '%pedido%' AND lower(nombre) LIKE '%oferta%' LIMIT 1;
  SELECT id INTO g_cum FROM public.gaps WHERE lower(nombre) LIKE '%cumplimiento%' AND lower(nombre) LIKE '%entrega%' LIMIT 1;
  SELECT id INTO g_fac FROM public.gaps WHERE lower(nombre) LIKE '%facturaci%' AND lower(nombre) LIKE '%registro%' LIMIT 1;
  SELECT id INTO g_cob FROM public.gaps WHERE lower(nombre) LIKE '%cobranza%' AND lower(nombre) LIKE '%capital%' LIMIT 1;
  SELECT id INTO g_ren FROM public.gaps WHERE lower(nombre) LIKE '%rentabilidad%' AND lower(nombre) LIKE '%cliente%' LIMIT 1;

  SELECT id INTO k_otif
  FROM public.catalog_kpis
  WHERE lower(nombre) LIKE '%otif%' OR lower(nombre) LIKE 'kpi-01%'
  LIMIT 1;

  SELECT id INTO k_ev_t0
  FROM public.catalog_kpis
  WHERE (lower(nombre) LIKE '%evidencias%' AND lower(nombre) LIKE '%t+0%')
     OR lower(nombre) LIKE 'kpi-04%'
  LIMIT 1;

  SELECT id INTO k_exac
  FROM public.catalog_kpis
  WHERE (lower(nombre) LIKE '%exactitud%' AND lower(nombre) LIKE '%facturaci%')
     OR lower(nombre) LIKE 'kpi-05%'
  LIMIT 1;

  SELECT id INTO k_dso
  FROM public.catalog_kpis
  WHERE lower(nombre) LIKE '%dso%' OR lower(nombre) LIKE 'kpi-06%'
  LIMIT 1;

  SELECT id INTO k_mar
  FROM public.catalog_kpis
  WHERE lower(nombre) LIKE '%margen%' OR lower(nombre) LIKE 'kpi-08%'
  LIMIT 1;

  SELECT id INTO k_nps
  FROM public.catalog_kpis
  WHERE lower(nombre) LIKE '%nps%' OR lower(nombre) LIKE 'kpi-09%'
  LIMIT 1;

  SELECT id INTO k_por
  FROM public.catalog_kpis
  WHERE lower(nombre) LIKE '%perfect order%' OR lower(nombre) LIKE 'kpi-10%'
  LIMIT 1;

  IF g_ped IS NULL OR g_cum IS NULL OR k_otif IS NULL THEN
    RAISE NOTICE 'seed_qa_acciones_usuarios_filtros: faltan gaps/KPIs O2C; se omite.';
    RETURN;
  END IF;

  DELETE FROM public.notificaciones WHERE payload->>'origen' = 'qa_seed';
  DELETE FROM public.acciones_diarias WHERE titulo_accion LIKE 'QA FILTROS - %';
  DELETE FROM public.sprints WHERE id = sprint_qa;

  INSERT INTO public.sprints (
    id, nombre, objetivo, fecha_inicio, fecha_fin, estado, velocidad_planificada,
    created_by, descripcion, kpi_id, gap_id, responsable_id, created_at, updated_at
  ) VALUES (
    sprint_qa,
    'QA filtros y validaciones',
    'Datos controlados para probar filtros, checks, evidencia, bloqueos y permisos.',
    DATE '2026-06-08',
    DATE '2026-06-19',
    'activo',
    34,
    u_gerardo,
    'Sprint semilla para pruebas funcionales de acciones.',
    k_otif,
    g_cum,
    u_leslie,
    TIMESTAMPTZ '2026-06-08 14:00:00+00',
    TIMESTAMPTZ '2026-06-08 14:00:00+00'
  );

  INSERT INTO public.acciones_diarias (
    id, fecha, titulo_accion, descripcion_accion, responsable, created_by, updated_by,
    hora_limite, evidencia_esperada, evidencia_cargada, evidencia_adjunta, estado,
    prioridad, area, gap_id, catalog_kpi_id, story_points, tipo_accion, sprint_id,
    causa_raiz, responsable_bloqueo, escalado, fecha_escalamiento, notas_escalamiento,
    repeticion, verificador_dato, verificador_gobierno, completed_at, completed_by,
    verified_at, verified_by, created_at, updated_at
  ) VALUES
  (
    a1, DATE '2026-06-08',
    'QA FILTROS - Jorge dashboard direccion',
    'Como: Consolidar el tablero ejecutivo diario con semaforos O2C y notas de riesgo.' || E'\n\n' ||
    'Quiero: Una vista de direccion con prioridades, responsables y tendencia de avance.' || E'\n\n' ||
    'Para que: Jorge pueda filtrar acciones estrategicas y tomar decisiones de escalamiento.',
    u_jorge, u_gerardo, u_gerardo, TIME '09:00',
    'Captura del dashboard ejecutivo con semaforos y lista de riesgos', false, NULL,
    'Hoy'::action_status, 'P1_Critica'::prioridad_nc,
    'Direccion general', g_ren, k_mar, 8, 'estrategica', NULL,
    NULL, NULL, false, NULL, NULL, false,
    u_leslie, u_gerardo, NULL, NULL, NULL, NULL,
    TIMESTAMPTZ '2026-06-08 13:00:00+00', TIMESTAMPTZ '2026-06-08 13:00:00+00'
  ),
  (
    a2, DATE '2026-06-08',
    'QA FILTROS - Leslie checklist T+0',
    'Como: Revisar la captura T+0 de evidencias con una lista de validacion por folio.' || E'\n\n' ||
    'Quiero: Detectar faltantes antes del cierre operativo del dia.' || E'\n\n' ||
    'Para que: El filtro de checklist pendiente muestre una accion en ejecucion con checks parciales.',
    u_leslie, u_jorge, u_leslie, TIME '11:30',
    'Lista de folios revisados y bitacora de evidencias faltantes', false, NULL,
    'En_Ejecucion'::action_status, 'P2_Media'::prioridad_nc,
    'Sistemas', g_fac, k_ev_t0, 5, 'operativa', NULL,
    NULL, NULL, false, NULL, NULL, true,
    u_gerardo, u_jorge, NULL, NULL, NULL, NULL,
    TIMESTAMPTZ '2026-06-08 13:20:00+00', TIMESTAMPTZ '2026-06-08 13:20:00+00'
  ),
  (
    a3, DATE '2026-06-09',
    'QA FILTROS - Gerardo sprint OTIF',
    'Como: Coordinar un huddle de sprint para destrabar causas de OTIF en ruta critica.' || E'\n\n' ||
    'Quiero: Separar tareas de sprint de tareas RUN en el centro de sprint.' || E'\n\n' ||
    'Para que: Gerardo pueda validar filtros por tipo sprint, responsable y fecha compromiso.',
    u_gerardo, u_jorge, u_gerardo, TIME '13:00',
    'Minuta del huddle con acuerdos, responsables y fecha de seguimiento', false, NULL,
    'Pendiente'::action_status, 'P2_Media'::prioridad_nc,
    'Proyectos', g_cum, k_otif, 8, 'sprint', sprint_qa,
    NULL, NULL, false, NULL, NULL, false,
    u_leslie, u_jorge, NULL, NULL, NULL, NULL,
    TIMESTAMPTZ '2026-06-08 13:40:00+00', TIMESTAMPTZ '2026-06-08 13:40:00+00'
  ),
  (
    a4, DATE '2026-06-07',
    'QA FILTROS - Nancy bloqueo DSO',
    'Como: Conciliar cartera vencida con operaciones y solicitar aprobacion de nota de credito.' || E'\n\n' ||
    'Quiero: Registrar causa raiz y responsable de desbloqueo para una accion bloqueada.' || E'\n\n' ||
    'Para que: Nancy pruebe filtros de bloqueo, prioridad critica y escalamiento.',
    u_nancy, u_gerardo, u_nancy, TIME '10:00',
    'Matriz de cartera vencida con aprobacion solicitada y folios afectados', false, NULL,
    'Bloqueado'::action_status, 'P1_Critica'::prioridad_nc,
    'Finanzas', g_cob, k_dso, 13, 'desbloqueo', NULL,
    'Falta aprobacion de direccion para nota de credito en cuenta prioritaria.',
    u_jorge, true, TIMESTAMPTZ '2026-06-08 15:00:00+00',
    'Escalado a direccion por impacto en DSO y cierre mensual.',
    true, u_leslie, u_jorge, NULL, NULL, NULL, NULL,
    TIMESTAMPTZ '2026-06-07 15:00:00+00', TIMESTAMPTZ '2026-06-08 15:00:00+00'
  ),
  (
    a5, DATE '2026-06-08',
    'QA FILTROS - Damaris alta perfiles',
    'Como: Validar altas y permisos de usuarios operativos por area y rol.' || E'\n\n' ||
    'Quiero: Confirmar que el catalogo de usuarios se mantiene consistente.' || E'\n\n' ||
    'Para que: Damaris pueda probar busqueda por texto, area RH y evidencia cargada.',
    u_damaris, u_leslie, u_damaris, TIME '16:00',
    'CSV de usuarios revisados y evidencia de perfiles activos', true,
    'qa/evidencias/damaris-alta-perfiles.csv',
    'Hecho'::action_status, 'P3_Baja'::prioridad_nc,
    'RH', g_ped, k_por, 3, 'operativa', NULL,
    NULL, NULL, false, NULL, NULL, false,
    u_leslie, u_gerardo,
    TIMESTAMPTZ '2026-06-08 20:30:00+00', u_damaris, NULL, NULL,
    TIMESTAMPTZ '2026-06-08 14:10:00+00', TIMESTAMPTZ '2026-06-08 20:30:00+00'
  ),
  (
    a6, DATE '2026-06-08',
    'QA FILTROS - Abraham validacion promesa',
    'Como: Revisar pedidos con fecha promesa vencida y actualizar responsables de seguimiento.' || E'\n\n' ||
    'Quiero: Tener una accion en retraso para validar columna y filtros automaticos.' || E'\n\n' ||
    'Para que: Abraham pruebe deteccion de retrasos por fecha y hora limite.',
    u_abraham, u_gerardo, u_abraham, TIME '08:00',
    'Reporte de pedidos vencidos con responsable y nueva fecha promesa', false, NULL,
    'Retraso'::action_status, 'P1_Critica'::prioridad_nc,
    'Planeacion', g_ped, k_por, 5, 'operativa', NULL,
    'Sin confirmacion de fecha promesa actualizada por dos cuentas clave.',
    u_antonio, false, NULL, NULL, true,
    u_leslie, u_jorge, NULL, NULL, NULL, NULL,
    TIMESTAMPTZ '2026-06-08 12:00:00+00', TIMESTAMPTZ '2026-06-08 16:00:00+00'
  ),
  (
    a7, DATE '2026-06-08',
    'QA FILTROS - Antonio cierre OTIF',
    'Como: Cerrar ruta piloto con evidencia fotografica y conciliacion contra plan OTIF.' || E'\n\n' ||
    'Quiero: Tener una accion verificada con evidencia y checks completos.' || E'\n\n' ||
    'Para que: Antonio pruebe filtros de cierre, evidencias y validacion final.',
    u_antonio, u_jorge, u_antonio, TIME '18:00',
    'Fotos de entrega, folios conciliados y confirmacion del cliente', true,
    'qa/evidencias/antonio-cierre-otif.zip',
    'Verificado'::action_status, 'P2_Media'::prioridad_nc,
    'Operaciones', g_cum, k_otif, 5, 'operativa', NULL,
    NULL, NULL, false, NULL, NULL, false,
    u_leslie, u_jorge,
    TIMESTAMPTZ '2026-06-08 22:10:00+00', u_antonio,
    TIMESTAMPTZ '2026-06-08 22:40:00+00', u_jorge,
    TIMESTAMPTZ '2026-06-08 14:30:00+00', TIMESTAMPTZ '2026-06-08 22:40:00+00'
  ),
  (
    a8, DATE '2026-06-10',
    'QA FILTROS - Nancy NPS facturacion',
    'Como: Revisar quejas NPS asociadas a diferencias de factura y notas operativas.' || E'\n\n' ||
    'Quiero: Cruzar NPS con exactitud de facturacion para una accion multi-KPI.' || E'\n\n' ||
    'Para que: El equipo pruebe filtros por KPI, busqueda NPS y colaboracion entre usuarios.',
    u_nancy, u_damaris, u_nancy, TIME '12:30',
    'Matriz NPS vs diferencias de factura con acuerdos de correccion', false, NULL,
    'Hoy'::action_status, 'P2_Media'::prioridad_nc,
    'Finanzas', g_fac, k_exac, 8, 'estrategica', NULL,
    NULL, NULL, false, NULL, NULL, false,
    u_leslie, u_jorge, NULL, NULL, NULL, NULL,
    TIMESTAMPTZ '2026-06-08 15:10:00+00', TIMESTAMPTZ '2026-06-08 15:10:00+00'
  );

  INSERT INTO public.accion_gaps (accion_id, gap_id)
  SELECT *
  FROM (
    VALUES
      (a1, g_ren), (a1, g_cob),
      (a2, g_fac), (a2, g_cum),
      (a3, g_cum),
      (a4, g_cob),
      (a5, g_ped),
      (a6, g_ped), (a6, g_cum),
      (a7, g_cum),
      (a8, g_fac), (a8, g_ren)
  ) AS v(accion_id, gap_id)
  WHERE gap_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO public.accion_catalog_kpis (accion_id, catalog_kpi_id)
  SELECT *
  FROM (
    VALUES
      (a1, k_mar), (a1, k_dso),
      (a2, k_ev_t0), (a2, k_otif),
      (a3, k_otif),
      (a4, k_dso),
      (a5, k_por),
      (a6, k_por), (a6, k_otif),
      (a7, k_otif),
      (a8, k_exac), (a8, k_nps)
  ) AS v(accion_id, catalog_kpi_id)
  WHERE catalog_kpi_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO public.accion_checkpoints (
    accion_id, texto, orden, obligatorio, activo, completado, checked_at, checked_by
  ) VALUES
    (a1, 'Validar que direccion vea la accion en filtro estrategica', 1, true, true, false, NULL, NULL),
    (a1, 'Agregar nota de riesgo ejecutivo', 2, false, true, false, NULL, NULL),
    (a2, 'Revisar muestra de folios T+0', 1, true, true, true, TIMESTAMPTZ '2026-06-08 16:00:00+00', u_leslie),
    (a2, 'Confirmar evidencia faltante por folio', 2, true, true, false, NULL, NULL),
    (a3, 'Alinear backlog del sprint con OTIF', 1, true, true, false, NULL, NULL),
    (a4, 'Identificar aprobador de nota de credito', 1, true, true, true, TIMESTAMPTZ '2026-06-08 15:20:00+00', u_nancy),
    (a4, 'Obtener aprobacion de direccion', 2, true, true, false, NULL, NULL),
    (a5, 'Cargar CSV de perfiles activos', 1, true, true, true, TIMESTAMPTZ '2026-06-08 20:25:00+00', u_damaris),
    (a5, 'Validar rol Operativo en catalogo', 2, true, true, true, TIMESTAMPTZ '2026-06-08 20:28:00+00', u_leslie),
    (a7, 'Confirmar evidencias de entrega', 1, true, true, true, TIMESTAMPTZ '2026-06-08 22:05:00+00', u_antonio),
    (a7, 'Validar cierre por direccion', 2, true, true, true, TIMESTAMPTZ '2026-06-08 22:35:00+00', u_jorge),
    (a8, 'Cruzar NPS con diferencias de factura', 1, true, true, false, NULL, NULL);

  INSERT INTO public.accion_evidencias (accion_id, storage_path, file_name, content_type, uploaded_at, uploaded_by)
  VALUES
    (a5, 'qa/evidencias/damaris-alta-perfiles.csv', 'damaris-alta-perfiles.csv', 'text/csv', TIMESTAMPTZ '2026-06-08 20:25:00+00', u_damaris),
    (a7, 'qa/evidencias/antonio-cierre-otif.zip', 'antonio-cierre-otif.zip', 'application/zip', TIMESTAMPTZ '2026-06-08 22:05:00+00', u_antonio);

  INSERT INTO public.accion_comentarios (accion_id, created_by, contenido, adjuntos, created_at)
  VALUES
    (a4, u_nancy, 'Bloqueo listo para validar escalamiento y responsable de desbloqueo: @Jorge Gonzalez.', '[]'::jsonb, TIMESTAMPTZ '2026-06-08 15:05:00+00'),
    (a8, u_damaris, 'Incluyo a Finanzas para probar colaboracion entre creador y responsable.', '[]'::jsonb, TIMESTAMPTZ '2026-06-08 15:20:00+00');

  INSERT INTO public.notificaciones (usuario_id, tipo, prioridad, leido, payload, created_at)
  VALUES
    (
      u_jorge,
      'accion_escalada',
      'Urgente'::notificacion_prioridad,
      false,
      jsonb_build_object('accion_id', a4, 'titulo', 'QA FILTROS - Nancy bloqueo DSO', 'origen', 'qa_seed'),
      TIMESTAMPTZ '2026-06-08 15:05:00+00'
    ),
    (
      u_leslie,
      'checkpoint_pendiente',
      'Alta'::notificacion_prioridad,
      false,
      jsonb_build_object('accion_id', a2, 'titulo', 'QA FILTROS - Leslie checklist T+0', 'origen', 'qa_seed'),
      TIMESTAMPTZ '2026-06-08 16:05:00+00'
    );

  RAISE NOTICE 'seed_qa_acciones_usuarios_filtros: insertadas 8 acciones QA FILTROS.';
END;
$$;
