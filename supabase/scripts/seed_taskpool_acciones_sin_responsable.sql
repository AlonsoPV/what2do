-- =============================================================================
-- 10 actividades dummy en TASKPOOL (sin responsable asignado)
--
-- Requisitos:
--   - Migración 20260626120000_acciones_responsable_nullable_taskpool.sql aplicada
--   - Al menos un usuario en public.usuarios (para created_by)
--
-- Idempotente: borra e inserta filas con titulo 'TASKPOOL DEMO ·%'
-- Ejecutar en Supabase SQL Editor como postgres / service_role.
-- =============================================================================

DO $$
DECLARE
  u_creator uuid;
  today date := CURRENT_DATE;
BEGIN
  SELECT id INTO u_creator
  FROM public.usuarios
  WHERE activo = true
  ORDER BY created_at
  LIMIT 1;

  IF u_creator IS NULL THEN
    SELECT id INTO u_creator FROM public.usuarios ORDER BY created_at LIMIT 1;
  END IF;

  IF u_creator IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en public.usuarios. Crea al menos uno antes del seed.';
  END IF;

  DELETE FROM public.acciones_diarias
  WHERE titulo_accion LIKE 'TASKPOOL DEMO ·%';

  INSERT INTO public.acciones_diarias (
    id,
    no_actividad,
    fecha,
    fecha_inicio,
    titulo_accion,
    descripcion_accion,
    instrucciones_especificas,
    objetivo,
    responsable,
    created_by,
    hora_limite,
    evidencia_esperada,
    evidencia_cargada,
    estado,
    prioridad,
    area,
    tipo_accion,
    story_points,
    created_at,
    updated_at
  ) VALUES
  (
    'a1b2c3d4-0001-4000-8000-000000000001',
    'TP-001',
    today + 7,
    today,
    'TASKPOOL DEMO · Revisar inventario crítico',
    'Validar existencias de SKU prioritarios en almacén central y reportar faltantes.',
    'Validar existencias de SKU prioritarios en almacén central y reportar faltantes.',
    'Tener visibilidad de quiebres antes del cierre semanal.',
    NULL,
    u_creator,
    TIME '17:00',
    'Reporte de faltantes con SKU y cantidad',
    false,
    'En_Pausa'::public.action_status,
    'P2_Media',
    'Operaciones',
    'operativa',
    3,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0002-4000-8000-000000000002',
    'TP-002',
    today + 10,
    today,
    'TASKPOOL DEMO · Actualizar matriz de responsables',
    'Consolidar la matriz RACI del proceso de pedidos con áreas involucradas.',
    'Consolidar la matriz RACI del proceso de pedidos con áreas involucradas.',
    'Clarificar ownership antes del siguiente sprint.',
    NULL,
    u_creator,
    TIME '17:00',
    'Matriz RACI actualizada en formato compartido',
    false,
    'En_Pausa'::public.action_status,
    'P3_Baja',
    'RH',
    'operativa',
    2,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0003-4000-8000-000000000003',
    'TP-003',
    today + 5,
    today,
    'TASKPOOL DEMO · Validar evidencias T+0',
    'Revisar que los folios del día anterior tengan evidencia cargada en el sistema.',
    'Revisar que los folios del día anterior tengan evidencia cargada en el sistema.',
    'Reducir retrabos por evidencia incompleta.',
    NULL,
    u_creator,
    TIME '12:00',
    'Listado de folios con estatus de evidencia',
    false,
    'En_Pausa'::public.action_status,
    'P1_Critica',
    'Calidad',
    'operativa',
    5,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0004-4000-8000-000000000004',
    'TP-004',
    today + 14,
    today + 1,
    'TASKPOOL DEMO · Diseñar tablero de OTIF',
    'Definir métricas, fuente de datos y layout del tablero semanal de OTIF.',
    'Definir métricas, fuente de datos y layout del tablero semanal de OTIF.',
    'Tener un tablero único para seguimiento de cumplimiento.',
    NULL,
    u_creator,
    TIME '17:00',
    'Boceto o captura del tablero propuesto',
    false,
    'En_Pausa'::public.action_status,
    'P2_Media',
    'Planeación',
    'estrategica',
    8,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0005-4000-8000-000000000005',
    'TP-005',
    today + 3,
    today,
    'TASKPOOL DEMO · Conciliar pedidos pendientes',
    'Cruzar pedidos abiertos con planeación y confirmar fechas promesa.',
    'Cruzar pedidos abiertos con planeación y confirmar fechas promesa.',
    'Evitar promesas incumplidas en la semana.',
    NULL,
    u_creator,
    TIME '10:00',
    'Reporte de pedidos conciliados',
    false,
    'En_Pausa'::public.action_status,
    'P1_Critica',
    'Comercial',
    'operativa',
    5,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0006-4000-8000-000000000006',
    'TP-006',
    today + 21,
    today + 2,
    'TASKPOOL DEMO · Documentar flujo de facturación',
    'Mapear pasos del flujo de facturación y puntos de control actuales.',
    'Mapear pasos del flujo de facturación y puntos de control actuales.',
    'Base para reducir errores de facturación.',
    NULL,
    u_creator,
    TIME '17:00',
    'Diagrama de flujo con responsables por paso',
    false,
    'En_Pausa'::public.action_status,
    'P2_Media',
    'Finanzas',
    'operativa',
    5,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0007-4000-8000-000000000007',
    'TP-007',
    today + 8,
    today,
    'TASKPOOL DEMO · Capacitar equipo en checklist',
    'Preparar guía breve y sesión de 30 min sobre uso del checklist en acciones.',
    'Preparar guía breve y sesión de 30 min sobre uso del checklist en acciones.',
    'Homologar criterios de cierre operativo.',
    NULL,
    u_creator,
    TIME '16:00',
    'Guía PDF y lista de asistencia',
    false,
    'En_Pausa'::public.action_status,
    'P3_Baja',
    'Sistemas',
    'operativa',
    3,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0008-4000-8000-000000000008',
    'TP-008',
    today + 6,
    today,
    'TASKPOOL DEMO · Revisar cartera vencida',
    'Identificar cuentas con más de 30 días y proponer plan de gestión.',
    'Identificar cuentas con más de 30 días y proponer plan de gestión.',
    'Priorizar gestión de cobranza de la semana.',
    NULL,
    u_creator,
    TIME '11:00',
    'Listado top 20 cuentas vencidas',
    false,
    'En_Pausa'::public.action_status,
    'P1_Critica',
    'Finanzas',
    'operativa',
    8,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0009-4000-8000-000000000009',
    'TP-009',
    today + 12,
    today + 1,
    'TASKPOOL DEMO · Estandarizar plantilla de acta',
    'Unificar formato de actas de reunión con campos mínimos obligatorios.',
    'Unificar formato de actas de reunión con campos mínimos obligatorios.',
    'Mejorar trazabilidad de acuerdos.',
    NULL,
    u_creator,
    TIME '17:00',
    'Plantilla publicada en repositorio compartido',
    false,
    'En_Pausa'::public.action_status,
    'P3_Baja',
    'Dirección general',
    'operativa',
    2,
    now(),
    now()
  ),
  (
    'a1b2c3d4-0010-4000-8000-000000000010',
    'TP-010',
    today + 4,
    today,
    'TASKPOOL DEMO · Validar rutas de entrega críticas',
    'Confirmar rutas con mayor volumen y riesgo de retraso para el fin de semana.',
    'Confirmar rutas con mayor volumen y riesgo de retraso para el fin de semana.',
    'Anticipar desvíos en última milla.',
    NULL,
    u_creator,
    TIME '09:00',
    'Mapa o reporte de rutas validadas',
    false,
    'En_Pausa'::public.action_status,
    'P2_Media',
    'Logística',
    'operativa',
    5,
    now(),
    now()
  );

  RAISE NOTICE 'Seed taskpool: 10 actividades sin responsable (created_by=%).', u_creator;
END $$;

-- Verificación
SELECT
  no_actividad,
  titulo_accion,
  responsable,
  estado,
  area,
  fecha_inicio,
  fecha AS fecha_termino
FROM public.acciones_diarias
WHERE titulo_accion LIKE 'TASKPOOL DEMO ·%'
ORDER BY no_actividad;
