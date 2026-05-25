export type PlanBadgeTone = 'violet' | 'green' | 'amber'
export type PlanTaskTone = 'violet' | 'green' | 'amber'
export type PlanResourceKind = 'file' | 'link' | 'youtube' | 'video'

export type PlanResource = {
  title: string
  url?: string
  hint?: string
  kind: PlanResourceKind
}

export type PlanTask = {
  text: string
  tone: PlanTaskTone
}

export type PlanTaskSection = {
  label: string
  tasks: PlanTask[]
}

export type PlanCard = {
  badge: string
  badgeTone: PlanBadgeTone
  title: string
  tag?: string
  resourceLabel?: string
  resources?: PlanResource[]
  /** Una sola sección de tareas (legacy simple). */
  taskLabel?: string
  tasks?: PlanTask[]
  /** Varias secciones con etiqueta (p. ej. script de discovery). */
  taskSections?: PlanTaskSection[]
  connection?: string
  deliverable?: string
  cursorNote?: string
}

export type PlanRule = {
  title: string
  text: string
}

export type PlanTrack = {
  id: 'capacitacion' | 'tablero' | 'empresa'
  label: string
  phaseLabel: string
  tabClass: 't1' | 't2' | 't3'
  cards: PlanCard[]
  rules?: PlanRule[]
}

export const PLAN_ACCION_TRACKS: PlanTrack[] = [
  {
    id: 'capacitacion',
    label: 'Capacitación',
    tabClass: 't1',
    phaseLabel: 'Pista 1 — Capacitación · 6 meses · 100% recursos gratuitos',
    cards: [
      {
        badge: 'Mes 1',
        badgeTone: 'violet',
        title: 'Scrum — fundamentos y certificación PSM I',
        tag: 'Scrum',
        resourceLabel: 'Recursos gratuitos — en este orden',
        resources: [
          {
            kind: 'file',
            title: 'Scrum Guide 2020 — documento oficial',
            url: 'https://scrumguides.org',
            hint: '11 páginas. Leer día 1 completo. Releer día 4 subrayando. Releer día 10 sin subrayar para medir retención.',
          },
          {
            kind: 'link',
            title: 'Mikhail Lapshin — Open Assessment gratuito',
            url: 'https://mlapshin.com/p/scrum-quiz',
            hint: 'Hacer el quiz diario. Meta: 95%+ antes del examen. Anotar preguntas fallidas y releer esa sección.',
          },
          {
            kind: 'link',
            title: 'Scrum.org — Open Assessment oficial',
            url: 'https://scrum.org/open-assessments/scrum-open',
            hint: 'Simulacro gratuito. Hacer 3 veces por semana. Mismo formato que el examen real.',
          },
          {
            kind: 'youtube',
            title: 'Agile Coach — Scrum en 20 minutos (YouTube)',
            hint: 'Video de refuerzo visual. Ver después de la primera lectura del Scrum Guide.',
          },
        ],
        taskLabel: 'Tareas de la semana',
        tasks: [
          {
            tone: 'violet',
            text: 'Semana 1–2: leer Scrum Guide + quiz diario + mapear conceptos a tu realidad (backlog = gaps priorizados, sprint = 2 semanas de acciones, DoD = acción Verificada + evidencia)',
          },
          {
            tone: 'violet',
            text: 'Semana 3: mock exam en scrum.org hasta 85%+ sostenido por 3 días seguidos',
          },
          {
            tone: 'violet',
            text: 'Semana 4: presentar al dueño cómo Scrum aplica en el tablero — 15 min con diapositivas',
          },
        ],
        connection:
          'El kanban ya es un tablero Scrum incompleto. Tu trabajo este mes: definir la cadencia de sprint (cada cuánto se hace planning, review y retro usando el tablero como soporte).',
        deliverable:
          'Examen PSM I completado (scrum.org, $150 USD — única inversión del plan). Meta: score ≥ 85%. + Documento "Cómo usamos Scrum en el tablero" (1 página).',
      },
      {
        badge: 'Mes 2',
        badgeTone: 'violet',
        title: 'BPMN — modelado de procesos desde cero',
        tag: 'BPMN',
        resourceLabel: 'Recursos gratuitos',
        resources: [
          {
            kind: 'video',
            title: 'Camunda Academy — BPMN 2.0 Tutorial',
            url: 'https://academy.camunda.com',
            hint: 'Módulos 1–6: eventos, tareas, gateways, pools, subprocesos. 2 módulos por día, tomar notas a mano.',
          },
          {
            kind: 'link',
            title: 'bpmn.io — modelador gratuito en browser',
            url: 'https://bpmn.io',
            hint: 'Sin instalación. Exporta XML, SVG y PNG. Usar para todos los diagramas del mes.',
          },
          {
            kind: 'file',
            title: 'OMG BPMN Quick Reference (PDF oficial)',
            url: 'https://www.omg.org/spec/BPMN',
            hint: 'Imprimir. Es el glosario oficial — tenerlo al lado mientras practicas.',
          },
        ],
        taskLabel: 'Un proceso por semana (aplicados a la empresa)',
        tasks: [
          { tone: 'violet', text: 'Semana 1: modelar "Capturar evidencia en sitio" (GAP-04) — solo tareas y secuencias básicas' },
          { tone: 'violet', text: 'Semana 2: modelar "Facturar automáticamente" (GAP-07) con pools y manejo de errores' },
          { tone: 'violet', text: 'Semana 3: modelar "Planear y asignar viaje" (GAP-01) con subprocesos colapsados' },
          { tone: 'violet', text: 'Semana 4: construir el flujo O2C maestro con los 8 procesos core como subprocesos' },
        ],
        connection:
          'Cada diagrama AS-IS se adjunta como evidencia en el gap correspondiente del tablero. El flujo O2C maestro es la documentación visual de por qué existen los 11 gaps.',
        deliverable: '4 diagramas BPMN de procesos reales de la empresa + flujo O2C maestro — presentados y validados con el dueño.',
      },
      {
        badge: 'Mes 3',
        badgeTone: 'violet',
        title: 'Lean — eliminación de desperdicio y value stream mapping',
        tag: 'Lean',
        resourceLabel: 'Recursos gratuitos',
        resources: [
          {
            kind: 'youtube',
            title: 'Lean Enterprise Institute — VSM tutorial (YouTube)',
            hint: 'Video de 45 min. Es el estándar. Ver tomando notas sobre los 8 desperdicios Lean.',
          },
          {
            kind: 'file',
            title: 'Toyota Production System — resumen gratuito',
            url: 'https://www.getabstract.com',
            hint: 'Base conceptual de Lean. Leer el resumen en GetAbstract (20 min).',
          },
          {
            kind: 'link',
            title: 'Miro — plantilla VSM gratuita',
            url: 'https://miro.com/templates',
            hint: 'Usar para construir el VSM del proceso O2C. Cuenta básica gratis.',
          },
        ],
        taskLabel: 'Aplicación directa a la empresa',
        tasks: [
          {
            tone: 'violet',
            text: 'Semana 1–2: identificar los 8 desperdicios Lean en el flujo O2C (sobreproducción, espera, transporte, defectos, inventario, movimiento, sobreprocesamiento, talento no utilizado)',
          },
          {
            tone: 'violet',
            text: 'Semana 3: construir el Value Stream Map del proceso con mayor desperdicio — probablemente facturación o evidencias',
          },
          {
            tone: 'violet',
            text: 'Semana 4: presentar el VSM al dueño y proponer 3 mejoras concretas como acciones en el tablero',
          },
        ],
        deliverable:
          'VSM del proceso O2C + mapa de desperdicios + 3 acciones Lean creadas en el tablero con su gap vinculado.',
      },
      {
        badge: 'Mes 4',
        badgeTone: 'green',
        title: 'Agile avanzado — Kanban, OKRs y diseño TO-BE',
        tag: 'Agile · OKRs',
        resourceLabel: 'Recursos gratuitos',
        resources: [
          {
            kind: 'file',
            title: 'Kanban Guide — documento oficial (gratis)',
            url: 'https://kanbanguides.org',
            hint: 'Complemento de Scrum. Leer completo (8 páginas). Identificar diferencias con el tablero actual.',
          },
          {
            kind: 'youtube',
            title: 'John Doerr — OKRs Ted Talk',
            hint: '18 min. Ver 2 veces. Estructura: Objetivo + 3 Key Results medibles. Aplicar a los FCE de la empresa.',
          },
          {
            kind: 'file',
            title: 'IDEO Method Cards — Design Thinking',
            url: 'https://www.ideo.com/post/method-cards',
            hint: 'Para diseñar procesos TO-BE. Usar tarjetas "Activity analysis" y "Rapid prototyping".',
          },
        ],
        taskLabel: 'Entregables del mes',
        tasks: [
          {
            tone: 'green',
            text: 'Redactar 3 OKRs para la empresa: uno por FCE prioritario, con Key Results directamente desde los KPIs del tablero',
          },
          {
            tone: 'green',
            text: 'Producir documentos AS-IS / TO-BE de los 3 gaps con mayor impacto (GAP-04, GAP-07, GAP-01)',
          },
        ],
        connection:
          'Los Key Results de los OKRs son los KPIs que ya existen en el tablero. El TO-BE de cada gap se convierte en la descripción formal del gap. Las acciones del kanban son el camino del AS-IS al TO-BE.',
        deliverable: '3 OKRs redactados + 3 documentos AS-IS/TO-BE en BPMN — listos para presentar al equipo directivo.',
      },
      {
        badge: 'Mes 5',
        badgeTone: 'green',
        title: 'North Star y planeación estratégica aplicada',
        tag: 'Estrategia',
        resourceLabel: 'Recursos gratuitos',
        resources: [
          {
            kind: 'file',
            title: 'Scaling Up — One Page Strategic Plan template',
            url: 'https://scalingup.com/resources',
            hint: 'Marco más usado en Latam para empresas medianas. Llenar con los datos reales de la empresa.',
          },
          {
            kind: 'youtube',
            title: 'Amplitude — North Star Metric explained',
            hint: 'Video de 20 min. El North Star es el único número que más importa. Identificarlo para la empresa.',
          },
          {
            kind: 'file',
            title: 'Good Strategy Bad Strategy — resumen',
            url: 'https://www.getabstract.com',
            hint: 'Leer el resumen. Anotar qué es el kernel de una buena estrategia: diagnóstico + política guía + acciones coherentes.',
          },
        ],
        taskLabel: 'Tareas',
        tasks: [
          {
            tone: 'green',
            text: 'Identificar la North Star Metric de la empresa (el número que mejor representa entrega de valor al cliente — probablemente "% entregas perfectas a tiempo")',
          },
          {
            tone: 'green',
            text: 'Completar el OPSP con los 8 FCE como "capacidades a construir" y los 11 gaps como "brechas a cerrar"',
          },
          {
            tone: 'green',
            text: 'Redactar el kernel estratégico de la empresa en 1 párrafo usando lenguaje Rumelt',
          },
        ],
        deliverable:
          'North Star Metric definida + One Page Strategic Plan completado + kernel estratégico — presentado al dueño para validación.',
      },
      {
        badge: 'Mes 6',
        badgeTone: 'amber',
        title: 'Facilitación ejecutiva — conducir sesiones estratégicas',
        tag: 'Facilitación',
        resourceLabel: 'Recursos gratuitos',
        resources: [
          {
            kind: 'youtube',
            title: 'AJ&Smart — Facilitation Fundamentals (YouTube)',
            url: 'https://www.youtube.com/@AJandSmart',
            hint: 'Ver los primeros 5 videos (~60 min total). Los más prácticos disponibles gratis.',
          },
          {
            kind: 'link',
            title: 'Miro — plantillas de strategic review (gratis)',
            url: 'https://miro.com/templates',
            hint: 'Usar para preparar la agenda visual de las sesiones mensuales con el dueño.',
          },
        ],
        taskLabel: 'Agenda estándar de sesión mensual (90 min)',
        tasks: [
          { tone: 'amber', text: 'Min 0–15: revisión del score global y semáforo KPI en el tablero — tú presentas, el dueño reacciona' },
          { tone: 'amber', text: 'Min 15–45: revisión de los 3 gaps prioritarios con sus documentos AS-IS/TO-BE' },
          { tone: 'amber', text: 'Min 45–75: priorización de acciones usando la Matriz de Impacto del tablero' },
          { tone: 'amber', text: 'Min 75–90: compromisos escritos — quién hace qué, creados como acciones en el tablero' },
        ],
        deliverable:
          'Primera sesión ejecutiva facilitada + acta de compromisos + agenda estandarizada para sesiones futuras.',
      },
    ],
  },
  {
    id: 'tablero',
    label: 'Tablero',
    tabClass: 't2',
    phaseLabel: 'Pista 2 — Optimización del tablero · paralelo a la capacitación',
    cards: [
      {
        badge: 'Sprint 1',
        badgeTone: 'green',
        title: 'Modelar las ceremonias Scrum dentro del tablero',
        tag: 'Mes 1',
        taskLabel: 'Qué implementar',
        tasks: [
          { tone: 'green', text: 'Definir la cadencia de sprint: cada 2 semanas, con fecha fija de planning (lunes) y review (viernes)' },
          { tone: 'green', text: 'Crear un campo "sprint" en acciones para agrupar las acciones del sprint actual en el kanban' },
          { tone: 'green', text: 'Definir la Definition of Done del equipo: acción en estado "Verificado" + evidencia cargada + KPI medido' },
          { tone: 'green', text: 'Crear una vista de "Sprint Goal" visible en el dashboard principal que muestre el objetivo del sprint activo' },
        ],
        cursorNote:
          'Agregar campo "sprint_id" a acciones_diarias + vista de sprint goal en el dashboard principal. Pedir la instrucción detallada cuando estés listo.',
      },
      {
        badge: 'Sprint 2',
        badgeTone: 'green',
        title: 'Agregar documentación BPMN por gap',
        tag: 'Mes 2',
        taskLabel: 'Qué implementar',
        tasks: [
          { tone: 'green', text: 'Agregar campo "diagrama_bpmn_url" a la tabla gaps en Supabase para adjuntar el PNG del proceso' },
          { tone: 'green', text: 'En la GapCard del tablero, mostrar un botón "Ver proceso BPMN" que abra el diagrama en modal' },
          { tone: 'green', text: 'Agregar campo "proceso_as_is" y "proceso_to_be" como texto en la descripción del gap' },
        ],
        cursorNote: 'Migración SQL + componente BpmnViewer en GapCard. Pedir la instrucción detallada cuando estés listo.',
      },
      {
        badge: 'Sprint 3',
        badgeTone: 'green',
        title: 'Dashboard de Lean — desperdicios y VSM live',
        tag: 'Mes 3',
        taskLabel: 'Qué implementar',
        tasks: [
          { tone: 'green', text: 'Agregar etiqueta de "tipo de desperdicio Lean" a las acciones (espera, defecto, sobreproducción, etc.)' },
          { tone: 'green', text: 'Vista de resumen en dashboard/gaps: conteo de acciones por tipo de desperdicio Lean' },
          { tone: 'green', text: 'Indicador de "tiempo de ciclo" por proceso: días promedio desde creación hasta "Verificado"' },
        ],
        cursorNote:
          'Campo desperdicio_lean en acciones + sección de análisis Lean en dashboard/gaps. Pedir instrucción cuando estés listo.',
      },
      {
        badge: 'Sprint 4',
        badgeTone: 'green',
        title: 'North Star Metric en el dashboard ejecutivo',
        tag: 'Mes 5',
        taskLabel: 'Qué implementar',
        tasks: [
          { tone: 'green', text: 'Agregar un widget de "North Star" en la parte superior del dashboard principal — el único número más importante' },
          { tone: 'green', text: 'El North Star debe mostrarse con su tendencia (última semana vs semana anterior) y el % de meta' },
          { tone: 'green', text: 'Agregar tabla de configuración en /estrategia para que el dueño pueda definir qué KPI es el North Star' },
        ],
        cursorNote: 'Tabla north_star_config en Supabase + widget en dashboard principal. Pedir instrucción cuando estés listo.',
      },
      {
        badge: 'Sprint 5',
        badgeTone: 'green',
        title: 'Módulo de capacitación integrado al tablero',
        tag: 'Mes 6',
        taskLabel: 'Qué implementar',
        tasks: [
          { tone: 'green', text: 'Página /capacitacion con los conceptos clave de Scrum, Lean y BPMN explicados en el contexto de la empresa' },
          { tone: 'green', text: 'Glosario interactivo: cada término del tablero (gap, KPI, story point, FCE) con su definición y ejemplo real' },
          { tone: 'green', text: 'Guía de ceremonias: cómo hacer la planning, review y retro usando el tablero — con agenda y preguntas guía' },
        ],
        cursorNote: 'Página /capacitacion con contenido estático + glosario interactivo. Pedir instrucción cuando estés listo.',
      },
    ],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    tabClass: 't3',
    phaseLabel: 'Pista 3 — Entender la empresa · proceso continuo desde el día 1',
    cards: [
      {
        badge: 'Sem 1–2',
        badgeTone: 'amber',
        title: 'Discovery operativo en oficina — entender sin salir a ruta',
        tag: 'Discovery',
        taskSections: [
          {
            label: 'Actividades concretas',
            tasks: [
              {
                tone: 'amber',
                text: 'Hacer 4 entrevistas de discovery en oficina, 45 min cada una: tráfico, operador o supervisor, facturación y cobranza. Objetivo: entender GAP-01, GAP-03, GAP-04 y GAP-07 sin salir a ruta.',
              },
              {
                tone: 'amber',
                text: 'Facilitar un walkthrough de 60 min con pantalla compartida: desde asignación del viaje hasta evidencia, facturación y cobranza. Pedir que narren qué sistema usan, qué dato capturan, dónde se atoran y qué retrabajo aparece.',
              },
              {
                tone: 'amber',
                text: 'Revisar 5 casos reales desde oficina: 2 viajes perfectos, 2 con incidencia y 1 con problema de factura o cobranza. Comparar tiempos, evidencia, responsables, mensajes y puntos de espera.',
              },
              {
                tone: 'amber',
                text: 'Cerrar con una junta de síntesis de 30 min con el dueño o líder operativo para validar hallazgos, priorizar pain points y acordar qué se convertirá en acción del tablero.',
              },
            ],
          },
          {
            label: 'Script de discovery — usar en cada entrevista',
            tasks: [
              {
                tone: 'amber',
                text: '1. "Cuéntame el último caso real que atendiste de inicio a fin. ¿Qué pasó primero, luego qué siguió y cómo supiste que terminó?"',
              },
              {
                tone: 'amber',
                text: '2. "¿Qué información necesitas para hacer bien tu parte y de quién depende que te llegue completa?"',
              },
              {
                tone: 'amber',
                text: '3. "¿Dónde se pierde más tiempo: esperando datos, corrigiendo errores, confirmando estatus, subiendo evidencia o resolviendo excepciones?"',
              },
              {
                tone: 'amber',
                text: '4. "Cuando algo falla, ¿cómo te enteras, quién decide qué hacer y cómo queda documentado?"',
              },
              {
                tone: 'amber',
                text: '5. "Si pudieras eliminar un paso, automatizar una captura o recibir una alerta antes, ¿qué elegirías y por qué?"',
              },
            ],
          },
          {
            label: 'Documentar en el tablero',
            tasks: [
              {
                tone: 'amber',
                text: 'Crear una acción por cada pain point encontrado, vincularla al gap correspondiente con story points asignados',
              },
            ],
          },
        ],
        deliverable:
          'Mapa de pain points por proceso (1 página) + matriz "hallazgo → evidencia → gap → acción" creada en el tablero. Tiempo total sugerido: 1 mañana de entrevistas + 1 hora de síntesis.',
      },
      {
        badge: 'Mes 1',
        badgeTone: 'amber',
        title: 'Entender el modelo de negocio y la propuesta de valor',
        tag: 'Estrategia',
        taskSections: [
          {
            label: 'Preguntas que debes poder responder al final del mes',
            tasks: [
              {
                tone: 'amber',
                text: '¿Cómo gana dinero la empresa? ¿Por ruta, por cliente, por tipo de carga? ¿Cuál es el margen promedio por viaje?',
              },
              {
                tone: 'amber',
                text: '¿Quiénes son los 3 clientes más importantes? ¿Qué exigen? ¿En qué fallamos con ellos?',
              },
              {
                tone: 'amber',
                text: '¿Cuál es el principal diferenciador competitivo hoy vs la competencia? ¿Es precio, confiabilidad, temperatura, rapidez?',
              },
              {
                tone: 'amber',
                text: '¿Cuál es el costo de una entrega perfecta vs una con incidencia? (Cuantificar en pesos)',
              },
            ],
          },
          {
            label: 'Cómo conseguir estas respuestas',
            tasks: [
              {
                tone: 'amber',
                text: 'Sesión de 1 hora con el dueño: preguntas abiertas, sin PowerPoint, solo escuchar y tomar notas',
              },
              {
                tone: 'amber',
                text: 'Revisar los últimos 3 meses de acciones en el tablero para identificar patrones de falla recurrentes',
              },
            ],
          },
        ],
        deliverable:
          'Business Model Canvas de la empresa completado (Miro, gratis) + mapa de clientes clave con sus exigencias principales.',
      },
      {
        badge: 'Mes 2–3',
        badgeTone: 'amber',
        title: 'Mapear los procesos tal como ocurren hoy (AS-IS real)',
        tag: 'BPMN',
        taskSections: [
          {
            label: 'Metodología',
            tasks: [
              {
                tone: 'amber',
                text: 'Por cada proceso del flujo O2C, hacer una sesión de 30 min con la persona que lo ejecuta — no con el jefe. El jefe describe cómo debería funcionar; el operador describe cómo realmente funciona.',
              },
              {
                tone: 'amber',
                text: 'Preguntar siempre: "¿hay algún paso que haces diferente a lo que está en el manual?" y "¿qué pasa cuando algo falla?"',
              },
              {
                tone: 'amber',
                text: 'Modelar el proceso AS-IS en bpmn.io inmediatamente después de la sesión, mientras los detalles están frescos',
              },
            ],
          },
          {
            label: 'Procesos a mapear (en orden de impacto)',
            tasks: [
              {
                tone: 'amber',
                text: '1. Captura de evidencia y PODs (GAP-04) — mayor impacto en score (5.38%)',
              },
              {
                tone: 'amber',
                text: '2. Facturación y Carta Porte (GAP-02, GAP-07) — segundo mayor impacto',
              },
              {
                tone: 'amber',
                text: '3. Monitoreo y tracking (GAP-03) — tercer mayor impacto',
              },
            ],
          },
        ],
        deliverable:
          '3 diagramas BPMN AS-IS validados con los ejecutores reales del proceso — no con el dueño.',
      },
      {
        badge: 'Mes 4–6',
        badgeTone: 'amber',
        title: 'Sesiones mensuales de revisión estratégica',
        tag: 'Facilitación',
        taskSections: [
          {
            label: 'Cadencia recomendada',
            tasks: [
              {
                tone: 'amber',
                text: 'Semanal (lunes, 30 min): Sprint planning con el equipo operativo — qué acciones entran al sprint, quién se compromete a qué',
              },
              {
                tone: 'amber',
                text: 'Quincenal (viernes, 45 min): Sprint review con el equipo — qué se completó, qué KPI se movió, qué se aprendió',
              },
              {
                tone: 'amber',
                text: 'Mensual (último viernes, 90 min): sesión estratégica con el dueño — revisión de score global, gaps, FCE y priorización del siguiente mes',
              },
            ],
          },
          {
            label: 'Regla de oro para cada sesión',
            tasks: [
              {
                tone: 'amber',
                text: 'Toda sesión termina con al menos 1 acción creada en el tablero con responsable y fecha asignados. Sin acción en el tablero, la sesión no ocurrió.',
              },
            ],
          },
        ],
        deliverable:
          'Cadencia de ceremonias funcionando + acta de cada sesión como acción en el tablero. Al mes 6: el equipo corre las ceremonias sin que tú las convoques.',
      },
    ],
    rules: [
      {
        title: 'La regla del 50/50',
        text: 'Por cada hora de estudio teórico, una hora de aplicación real al negocio. Si estudias VSM y no produces un VSM de la empresa esa misma semana, el aprendizaje se pierde. El tablero es tu laboratorio — úsalo.',
      },
      {
        title: 'El riesgo principal: estudiar sin producir artefactos',
        text: 'La tentación de consumir cursos, videos y libros sin generar entregables es alta. Cada mes debe tener un artefacto tangible que el dueño pueda ver, tocar y usar. Si no hay artefacto, no hay aprendizaje.',
      },
      {
        title: 'Scrum Master en este contexto no es gestionar sprints de software',
        text: 'Es ser el guardián del proceso de mejora continua. Tu backlog son los gaps, tu velocity son los story points completados por sprint, tu definition of done es el KPI en meta. Ya tienes todo modelado — ahora necesitas la cadencia y la disciplina de las ceremonias.',
      },
      {
        title: 'El tablero es tu credencial más poderosa',
        text: 'Más que cualquier certificación, tener un tablero vivo con datos reales, KPIs que se mueven y gaps que se cierran te posiciona como consultor. Cuando el dueño vea el score global pasar de 13% a 40%, eso vale más que un certificado en la pared.',
      },
    ],
  },
]
