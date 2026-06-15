import type { LearningModule } from '../types/academy.types'
import { getAcademyBaseModulePdfName } from './academyPdfCatalog'

export const ACADEMY_MODULES: LearningModule[] = [
  {
    id: 1,
    title: 'Diagnostico del Proceso Actual',
    subtitle: 'BPMN AS-IS: Order-to-Cash',
    duration: '2-3 horas',
    pdfName: getAcademyBaseModulePdfName(1),
    objectives: [
      'Entender que es un diagrama BPMN y como leerlo.',
      'Mapear tu proceso actual Order-to-Cash de principio a fin.',
      'Identificar cuellos de botella y puntos de dolor.',
      'Documentar ineficiencias y trabajo manual.',
    ],
    concepts: [
      {
        term: 'BPMN (Business Process Model and Notation)',
        description:
          'Notación estándar internacional para documentar procesos de negocio de forma visual. Usa símbolos estandarizados (eventos, actividades, compuertas, flujos) para representar cómo opera un proceso de principio a fin.',
      },
      {
        term: 'Swimlanes',
        description:
          'Carriles horizontales o verticales dentro de un diagrama BPMN que representan las áreas o roles que participan en el proceso. En el contexto O2C: Comercial, Operaciones, Monitoreo, Facturación y Finanzas. Permiten ver quién hace qué en cada etapa.',
      },
      {
        term: 'Actividades manuales vs. automatizadas',
        description:
          'Clasificación de cada tarea del proceso según si se ejecuta de forma manual (hojas de cálculo, WhatsApp, llamadas) o automatizada (sistema, API, notificación automática). Identificar esta distinción es el primer paso para priorizar la digitalización.',
      },
      {
        term: 'Puntos de decisión',
        description:
          'Compuertas en el diagrama BPMN donde el proceso puede tomar diferentes caminos según una condición (rechazos, incidencias, aprobaciones, excepciones). Son críticos porque cada bifurcación puede generar retrabajos o demoras si no está bien definida.',
      },
    ],
    steps: [
      'Lee el BPMN AS-IS completo e imprimelo en formato grande.',
      'Lista al menos 10 puntos de dolor.',
      'Cuantifica impacto estimado por punto de dolor.',
      'Valida hallazgos en reunion de 1 hora con lideres.',
    ],
    exercise:
      'Taller de validacion del AS-IS con Irhec, Nancy, Gerardo y coordinadores para priorizar 5 problemas criticos.',
    deliverable: 'Foto del BPMN con post-its y lista priorizada de problemas.',
    quiz: [
      {
        question: 'Que significa BPMN?',
        options: [
          'Business Process Model and Notation',
          'Business Plan Management Network',
          'Basic Process Mapping Notation',
          'Business Performance Measurement Notes',
        ],
        correctIndex: 0,
      },
      {
        question: 'Que representan los swimlanes?',
        options: [
          'Los sistemas tecnologicos',
          'Las areas o roles participantes',
          'El costo por actividad',
          'El tipo de cliente',
        ],
        correctIndex: 1,
      },
      {
        question: 'Objetivo principal del diagnostico AS-IS:',
        options: [
          'Disenar el proceso futuro',
          'Implementar tecnologia nueva',
          'Mapear y entender el proceso actual con sus ineficiencias',
          'Contratar nuevo personal',
        ],
        correctIndex: 2,
      },
      {
        question: 'Despues de identificar puntos de dolor, que sigue?',
        options: [
          'Ignorarlos y avanzar',
          'Cuantificar su impacto en tiempo, personas y dinero',
          'Eliminar el proceso completo',
          'Cambiar al equipo responsable',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 2,
    title: 'Vision del Proceso Objetivo',
    subtitle: 'BPMN TO-BE: El Futuro Digitalizado',
    duration: '2 horas',
    pdfName: getAcademyBaseModulePdfName(2),
    objectives: [
      'Comprender el proceso objetivo digitalizado y automatizado.',
      'Identificar diferencias clave AS-IS vs TO-BE.',
      'Entender el rol del TMS como eje de la transformacion.',
      'Visualizar flujo de informacion sin intervencion manual.',
    ],
    concepts: [
      {
        term: 'Automatización end-to-end',
        description:
          'Visión donde el TMS (Transportation Management System) actúa como cerebro operativo central, conectando de forma continua y sin intervención manual los subprocesos de planificación, monitoreo, facturación y cobro.',
      },
      {
        term: 'Integración de sistemas',
        description:
          'Arquitectura tecnológica donde TMS + Motive (ELD/GPS) + App del Operador + Dashboards trabajan como un ecosistema unificado, eliminando la captura manual de datos y asegurando un flujo de información sin interrupciones.',
      },
      {
        term: 'Eliminación de WhatsApp',
        description:
          'Estrategia de migrar toda comunicación operativa (instrucciones, confirmaciones, incidencias) desde WhatsApp hacia canales formales: la app del operador y las notificaciones automáticas del TMS. Esto asegura trazabilidad y reduce errores.',
      },
      {
        term: 'PODs digitales',
        description:
          'Pruebas de Entrega (Proof of Delivery) capturadas electrónicamente mediante la app del operador: fotos escaneadas, firmas digitales y sellos de tiempo. Reemplazan el proceso manual de tomar fotos por WhatsApp y subirlas a carpetas compartidas.',
      },
    ],
    steps: [
      'Compara AS-IS vs TO-BE en tabla de 3 columnas.',
      'Clasifica cambios: tecnologicos vs organizacionales.',
      'Define 5 quick wins en 2 semanas.',
      'Presenta la vision al equipo directivo.',
    ],
    exercise: 'Sesion de vision TO-BE presentando ambos BPMNs al equipo directivo.',
    deliverable: 'Minuta de reunion con compromisos por area.',
    quiz: [
      {
        question: 'Rol del TMS en el proceso TO-BE:',
        options: [
          'Sustituir la facturacion manual solamente',
          'Ser el cerebro operativo que conecta punta a punta',
          'Solo generar reportes mensuales',
          'Controlar recursos humanos',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que son los PODs digitales?',
        options: [
          'Pedidos de compra automatizados',
          'Evidencias escaneadas en app y validadas automaticamente',
          'Paneles de operacion diaria',
          'Protocolos de direccion',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que son quick wins?',
        options: [
          'Cambios que requieren mucha inversion',
          'Cambios implementables rapidamente sin esperar al TMS',
          'Victorias en competencias deportivas',
          'Reduccion de personal',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 3,
    title: 'Analisis de Brechas',
    subtitle: 'Los 18 Gaps entre el AS-IS y TO-BE',
    duration: '3 horas',
    pdfName: getAcademyBaseModulePdfName(3),
    objectives: [
      'Comprender los 18 gaps identificados.',
      'Entender priorizacion: CRITICO, ALTO, MEDIO, ESTRUCTURAL.',
      'Mapear interdependencia entre gaps.',
      'Definir orden de ataque optimo.',
    ],
    concepts: [
      {
        term: 'Gap (Brecha)',
        description:
          'La diferencia medible entre cómo se ejecuta un proceso hoy (AS-IS) y cómo debería ejecutarse según el modelo objetivo (TO-BE). Se identificaron 18 gaps en el proceso O2C, cada uno con impacto cuantificable en tiempo, costo o calidad.',
      },
      {
        term: 'Priorización por impacto',
        description:
          'Sistema de clasificación de gaps en 4 niveles: CRÍTICO (afecta ingresos y clientes directamente), ALTO (impacto operativo significativo), MEDIO (mejora de eficiencia) y ESTRUCTURAL (foundation tecnológica o de procesos).',
      },
      {
        term: 'Interdependencia',
        description:
          'Relación de dependencia entre gaps: algunos no pueden cerrarse sin haber cerrado otros primero. Ejemplo: no puedes implementar PODs digitales (GAP-04) sin tener la App del Operador operativa (GAP-09). Mapear estas dependencias define el orden de ataque.',
      },
      {
        term: 'Sprint mapping',
        description:
          'Asignación de cada gap a sprints específicos del roadmap según su nivel de prioridad y sus dependencias. Los gaps CRÍTICOS se atacan en los primeros sprints (Fase Foundation), los ESTRUCTURALES se resuelven en paralelo como habilitadores.',
      },
    ],
    steps: [
      'Estudia el documento completo de GAP analysis.',
      'Crea diagrama de dependencias entre gaps.',
      'Confirma champions por gap.',
      'Valida baseline de cada gap con datos.',
    ],
    exercise: 'Workshop de gaps con coordinadores.',
    deliverable: 'Matriz de gaps validada con firmas de champions.',
    quiz: [
      {
        question: 'Cuantos gaps se identificaron?',
        options: ['10', '12', '18', '24'],
        correctIndex: 2,
      },
      {
        question: 'Que prioridad impacta ingresos y clientes de forma directa?',
        options: ['ESTRUCTURAL', 'MEDIO', 'ALTO', 'CRITICO'],
        correctIndex: 3,
      },
      {
        question: 'Que es un champion?',
        options: [
          'Herramienta de tablero',
          'Responsable asignado para cerrar un gap',
          'Documento de control',
          'Usuario con rol admin',
        ],
        correctIndex: 1,
      },
      {
        question: 'Por que mapear interdependencias?',
        options: [
          'Para reducir usuarios del sistema',
          'Porque algunos gaps dependen de otros',
          'Para eliminar reuniones',
          'Para subir evidencias',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 4,
    title: 'KPIs y OKRs Estrategicos',
    subtitle: 'Metricas para Medir el Exito',
    duration: '2 horas',
    pdfName: getAcademyBaseModulePdfName(4),
    objectives: [
      'Diferenciar KPI y OKR.',
      'Conocer metas numericas por sprint para cada KPI.',
      'Configurar baseline vs target.',
      'Vincular KPIs con gaps impactados.',
    ],
    concepts: [
      {
        term: 'OKR (Objective & Key Result)',
        description:
          'Marco de gestión donde el Objective define qué quieres lograr (cualitativo, inspiracional) y los Key Results definen cómo mides que lo lograste (cuantitativo, con números). Ejemplo: Objective = "Proceso de cobro ágil", KR = "Reducir días entrega→pago de 15 a 5".',
      },
      {
        term: 'KPI (Key Performance Indicator)',
        description:
          'Indicador específico que se mide periódicamente para evaluar el desempeño de un proceso. Cada KPI del sistema O2C tiene: baseline (valor actual), target a 6 meses, target a 12 meses y target a 18 meses, más un peso porcentual en el score global.',
      },
      {
        term: 'Leading vs. Lagging indicators',
        description:
          'Leading (adelantados): predicen resultados futuros y permiten actuar preventivamente (ej: % cumplimiento de checklist diario). Lagging (retrasados): confirman resultados ya ocurridos (ej: % satisfacción del cliente). Un buen sistema de medición combina ambos.',
      },
      {
        term: 'Sprint targets',
        description:
          'Metas incrementales definidas para cada sprint que trazan la ruta progresiva desde el baseline hasta el target final a 18 meses. Permiten medir avance continuo y detectar desviaciones tempranamente en lugar de esperar al final del proyecto.',
      },
    ],
    steps: [
      'Revisa la seccion de KPIs del documento.',
      'Levanta baseline de los 10 KPIs priorizados.',
      'Define calendario de medicion.',
      'Comunica metas por area/persona.',
    ],
    exercise: 'Taller de medicion baseline.',
    deliverable: 'Dashboard de KPIs con valores baseline documentados.',
    quiz: [
      {
        question: 'Diferencia entre KPI y OKR:',
        options: [
          'No hay diferencia',
          'KPI mide; OKR combina objetivo y resultado',
          'OKR solo aplica a finanzas',
          'KPI es solo cualitativo',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que es baseline?',
        options: [
          'Meta del mes 18',
          'Valor actual antes de mejoras',
          'Promedio anual',
          'Valor minimo aceptable',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que indicador predice resultados futuros?',
        options: ['Lagging indicator', 'Leading indicator', 'Retrospective', 'Scope creep'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 5,
    title: 'Matriz RACI y Estructura Lean',
    subtitle: 'Quien Hace Que - Roles Claros',
    duration: '3 horas',
    pdfName: getAcademyBaseModulePdfName(5),
    objectives: [
      'Comprender la matriz RACI.',
      'Identificar duplicidades y solapamientos.',
      'Diseñar estructura organizacional lean.',
      'Planificar comunicacion de cambios.',
    ],
    concepts: [
      {
        term: 'R — Responsible',
        description:
          'La persona que ejecuta la tarea. Idealmente solo una persona por tarea para evitar difusión de responsabilidad. Es quien "pone las manos" en el trabajo operativo.',
      },
      {
        term: 'A — Accountable',
        description:
          'La persona que responde por el resultado final. Solo UNA persona puede ser Accountable por tarea — esta es la regla de oro de RACI. Si algo sale mal, esta persona rinde cuentas.',
      },
      {
        term: 'C — Consulted',
        description:
          'Personas a quienes se les pide opinión o input antes de ejecutar la tarea. La comunicación es bidireccional: se pregunta, se escucha, se incorpora feedback. Son expertos o stakeholders cuya perspectiva es necesaria.',
      },
      {
        term: 'I — Informed',
        description:
          'Personas a quienes se les notifica después de que la tarea se completó. La comunicación es unidireccional: se informa el resultado. No participan en la ejecución ni en la decisión.',
      },
      {
        term: 'Lean Structure',
        description:
          'Filosofía organizacional que busca eliminar redundancias, empoderar roles clave y reducir capas innecesarias de supervisión. En el contexto O2C: consolidar funciones duplicadas (ej: Torre de Control + Monitoreo) y dar autonomía a los coordinadores.',
      },
    ],
    steps: [
      'Estudia la RACI propuesta.',
      'Marca conflictos de roles en la matriz.',
      'Revisa cambios de estructura lean.',
      'Define plan de comunicacion de cambios.',
    ],
    exercise: 'Validacion de RACI con lideres.',
    deliverable: 'Matriz RACI aprobada + plan de comunicacion.',
    quiz: [
      {
        question: "Que significa la 'A' en RACI?",
        options: ['Asistente', 'Accountable - quien responde por el resultado', 'Analista', 'Automatizado'],
        correctIndex: 1,
      },
      {
        question: 'Cuantas personas deben ser Accountable por tarea?',
        options: ['Todas las que participan', 'Minimo 2', 'Solo una', 'Depende del proyecto'],
        correctIndex: 2,
      },
      {
        question: 'Que busca una estructura lean?',
        options: [
          'Aumentar jerarquia',
          'Eliminar redundancias y empoderar roles',
          'Reducir KPIs',
          'Eliminar reuniones diarias',
        ],
        correctIndex: 1,
      },
      {
        question: 'Como se recomienda comunicar cambios de roles?',
        options: [
          'Por correo masivo sin previo aviso',
          'Individual con cada afectado, luego equipo y luego organizacion',
          'Solo al gerente general',
          'No se comunican',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 6,
    title: 'Metodologia Agil Aplicada',
    subtitle: 'Scrum Adaptado a Logistica Farmaceutica',
    duration: '2 horas',
    pdfName: getAcademyBaseModulePdfName(6),
    objectives: [
      'Entender principios de Scrum en el contexto O2C.',
      'Conocer ceremonias clave de sprint.',
      'Definir roles Product Owner, Scrum Master y Team.',
      'Configurar sprints de 4 semanas.',
    ],
    concepts: [
      {
        term: 'Sprint',
        description:
          'Período fijo de tiempo (4 semanas en este proyecto) durante el cual el equipo se compromete a completar un conjunto definido de User Stories. Al final de cada sprint se entrega valor tangible y medible.',
      },
      {
        term: 'Sprint Planning',
        description:
          'Ceremonia al inicio del sprint donde el equipo selecciona las User Stories que se compromete a completar. Se revisa prioridad, capacidad y dependencias. Duración típica: 2 horas.',
      },
      {
        term: 'Daily Standup',
        description:
          'Reunión diaria de máximo 15 minutos donde cada miembro responde 3 preguntas: ¿Qué hice ayer? ¿Qué haré hoy? ¿Tengo algún bloqueo? No es para resolver problemas, sino para visibilizar el estado.',
      },
      {
        term: 'Sprint Review',
        description:
          'Demostración al final del sprint de todo lo logrado, presentada ante stakeholders y el equipo directivo. Se muestran resultados concretos, no slides. Permite feedback temprano y ajustes de rumbo.',
      },
      {
        term: 'Retrospective',
        description:
          'Reunión al cierre del sprint donde el equipo reflexiona: ¿Qué salió bien? ¿Qué podemos mejorar? ¿Qué debemos dejar de hacer? Es la ceremonia más importante para la mejora continua del equipo.',
      },
    ],
    steps: [
      'Define roles Scrum del equipo.',
      'Configura ceremonias recurrentes en calendario.',
      'Prepara y presenta el tablero de sprint.',
      'Documenta Definition of Done.',
    ],
    exercise: 'Primer Sprint Planning (Sprint 1).',
    deliverable: 'Backlog comprometido de Sprint 1 + evidencia de la sesion.',
    quiz: [
      {
        question: 'Cuanto dura un sprint en esta academia?',
        options: ['1 semana', '2 semanas', '4 semanas', '6 semanas'],
        correctIndex: 2,
      },
      {
        question: 'Cuanto debe durar el daily standup?',
        options: ['1 hora', '30 minutos', '15 minutos', '5 minutos'],
        correctIndex: 2,
      },
      {
        question: 'Que se hace en la retrospective?',
        options: [
          'Definir presupuesto',
          'Revisar que salio bien, que mejorar y que dejar de hacer',
          'Asignar vacaciones',
          'Actualizar roles RACI',
        ],
        correctIndex: 1,
      },
      {
        question: 'Quien es el Product Owner?',
        options: [
          'El Scrum Master',
          'El proveedor del TMS',
          'El dueno de la vision del producto',
          'Cualquier coordinador',
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 7,
    title: 'User Stories y Backlog',
    subtitle: '46 Historias de Usuario Detalladas',
    duration: '3 horas',
    pdfName: getAcademyBaseModulePdfName(7),
    objectives: [
      'Aprender formato correcto de user stories.',
      'Entender story points y estimacion relativa.',
      'Aplicar priorizacion MoSCoW.',
      'Refinar historias con el equipo.',
    ],
    concepts: [
      {
        term: 'User Story',
        description:
          'Formato estándar para describir una necesidad desde la perspectiva del usuario: "Como [rol], quiero [acción], para que [beneficio]". Es la unidad mínima de trabajo planificable en el backlog. Cada story debe ser independiente, negociable y testeable.',
      },
      {
        term: 'Criterios de Aceptación',
        description:
          'Lista de condiciones específicas y verificables que deben cumplirse para que una User Story se considere "Done". Ejemplo: "El sistema genera la carta porte en menos de 2 minutos" o "El dashboard muestra datos actualizados cada hora".',
      },
      {
        term: 'Story Points',
        description:
          'Sistema de estimación relativa del esfuerzo necesario para completar una story. Usa la secuencia Fibonacci (1, 2, 3, 5, 8, 13) donde más puntos = más complejidad/esfuerzo. No representan horas, sino magnitud relativa comparada con otras stories.',
      },
      {
        term: 'MoSCoW',
        description:
          'Técnica de priorización que clasifica cada story en 4 categorías: Must (obligatorio, sin esto el sprint falla), Should (importante pero no bloqueante), Could (deseable si hay tiempo), Won\'t (no se hará en este ciclo, pero se documenta para el futuro).',
      },
      {
        term: 'Refinement',
        description:
          'Sesión periódica donde el equipo revisa, aclara y estima las User Stories antes de que entren a un sprint. Se resuelven ambigüedades, se detallan criterios de aceptación y se ajustan estimaciones. Stories no refinadas no deben entrar a Sprint Planning.',
      },
    ],
    steps: [
      'Revisa backlog completo e identifica dudas.',
      'Valida story points con planning poker.',
      'Refina stories del Sprint 1.',
      'Ordena backlog por prioridad en Kanban.',
    ],
    exercise: 'Sesion de refinement del Sprint 1.',
    deliverable: 'Stories de Sprint 1 refinadas y listas para ejecutar.',
    quiz: [
      {
        question: 'Formato correcto de una user story:',
        options: [
          'Cuando [evento], entonces [resultado]',
          'Como [rol], quiero [accion], para que [beneficio]',
          'Si [condicion], hacer [tarea]',
          'Objetivo - resultado - riesgo',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que son story points?',
        options: [
          'Horas de trabajo estimadas',
          'Estimacion relativa de esfuerzo usando Fibonacci',
          'Puntos de bonificacion para el equipo',
          'Calificaciones de calidad',
        ],
        correctIndex: 1,
      },
      {
        question: "Que significa 'Must' en MoSCoW?",
        options: ['Opcional', 'Se difiere a futuro', 'Obligatorio implementarlo', 'No aplica'],
        correctIndex: 2,
      },
      {
        question: 'Cuantas user stories tiene el backlog de referencia?',
        options: ['20', '30', '46', '100'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 8,
    title: 'Roadmap y Ejecucion',
    subtitle: 'Plan de 18 Meses - Arrancamos',
    duration: '2 horas',
    pdfName: getAcademyBaseModulePdfName(8),
    objectives: [
      'Visualizar plan completo de 18 meses con hitos.',
      'Entender fases Foundation, Scale y Optimize.',
      'Configurar seguimiento semanal y mensual.',
      'Arrancar oficialmente Sprint 1.',
    ],
    concepts: [
      {
        term: 'Fase 1: Foundation (Mes 1-6)',
        description:
          'Primera fase del roadmap enfocada en cerrar los gaps críticos que impactan directamente ingresos y operación diaria: planificación de rutas, carta porte digital, monitoreo en tiempo real, evidencias de entrega (PODs) y control de temperatura.',
      },
      {
        term: 'Fase 2: Scale (Mes 7-12)',
        description:
          'Segunda fase enfocada en escalar las soluciones implementadas: automatización de viáticos, despliegue completo de la app del operador, dashboards financieros avanzados e integración profunda con Motive (ELD/GPS).',
      },
      {
        term: 'Fase 3: Optimize (Mes 13-18)',
        description:
          'Tercera fase enfocada en optimización avanzada: incorporación de inteligencia artificial, modelos predictivos, análisis de cost-to-serve por cliente, mejora continua de procesos y certificación ISO 27001 de seguridad de información.',
      },
      {
        term: 'Governance',
        description:
          'Estructura de seguimiento y control del proyecto con 3 niveles de frecuencia: Daily standup (15 min, estado operativo), Weekly review (1 hr, avance del sprint), Monthly steering (2 hr, decisiones estratégicas con dirección).',
      },
      {
        term: 'Change Management',
        description:
          'Estrategia para gestionar la resistencia al cambio organizacional. Se basa en 3 pilares: comunicación constante y transparente, capacitación continua a través de la Academia O2C, y quick wins visibles que demuestren beneficios tangibles rápidamente.',
      },
    ],
    steps: [
      'Revisa roadmap completo y publcalo en area visible.',
      'Configura governance compartido.',
      'Prepara kick-off de transformacion.',
      'Envio oficial de arranque de Sprint 1.',
    ],
    exercise: 'Kick-off de Transformacion O2C de 2 horas con todo el equipo.',
    deliverable: 'Fotos del kick-off + minuta + compromisos firmados.',
    quiz: [
      {
        question: 'Cuanto dura el plan completo?',
        options: ['6 meses', '12 meses', '18 meses', '24 meses'],
        correctIndex: 2,
      },
      {
        question: 'Cuales son las tres fases del roadmap?',
        options: [
          'Discover, Build, Run',
          'Foundation, Scale, Optimize',
          'Plan, Do, Check',
          'Init, Pilot, Rollout',
        ],
        correctIndex: 1,
      },
      {
        question: 'Que se hace en Foundation?',
        options: [
          'Optimizar con IA',
          'Cerrar gaps criticos: planificacion, carta porte, monitoreo',
          'Solo capacitar al equipo',
          'Evaluar proveedores',
        ],
        correctIndex: 1,
      },
      {
        question: 'Frecuencia del steering meeting:',
        options: ['Diario', 'Semanal', 'Quincenal', 'Mensual'],
        correctIndex: 3,
      },
    ],
  },
]

export const ACADEMY_TOTAL_MODULES = ACADEMY_MODULES.length
