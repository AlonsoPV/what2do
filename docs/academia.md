Academia O2C — Especificación Completa
1. Visión General
La Academia O2C es una plataforma educativa integrada en la aplicación web de transformación Order-to-Cash. Su propósito es capacitar al equipo operativo y directivo en los conceptos, metodologías y herramientas necesarios para ejecutar el plan de transformación de 18 meses.

1.1 Objetivos de la Academia
Objetivo	Descripción
Capacitación progresiva	Guiar al equipo a través de 8 módulos secuenciales que cubren desde el diagnóstico hasta la ejecución
Validación de conocimiento	Asegurar comprensión mediante quizzes obligatorios al final de cada módulo
Seguimiento individual	Registrar el progreso de cada usuario de forma persistente entre sesiones y dispositivos
Material de referencia	Proveer documentos PDF descargables como material de consulta permanente
Desbloqueo progresivo	Garantizar que cada módulo se estudie en orden, desbloqueando el siguiente solo al aprobar el quiz anterior
2. Estructura Funcional
2.1 Flujo del Usuario
Login → Academia O2C → Lista de Módulos → Seleccionar Módulo (si desbloqueado)
    → Descargar PDF
    → Revisar Objetivos y Conceptos Clave
    → Completar Pasos (checkbox)
    → Completar Ejercicio Práctico (checkbox)
    → Presentar Quiz (100% aciertos requerido)
    → Módulo Completado → Siguiente Módulo Desbloqueado
2.2 Reglas de Negocio
Regla	Detalle
Desbloqueo	Módulo 1 siempre desbloqueado. Módulo N se desbloquea cuando el quiz del Módulo N-1 está aprobado O el Módulo N-1 está marcado como completado
Aprobación de quiz	Se requiere 100% de respuestas correctas para aprobar
Reintentos	Ilimitados. El usuario puede reintentar el quiz cuantas veces necesite
Progreso de pasos	Cada paso y ejercicio se marca individualmente con checkbox; el estado se persiste en tiempo real
Completar módulo	Al aprobar el quiz, el módulo se marca automáticamente como completado
Navegación	El usuario puede navegar entre módulos desbloqueados libremente, revisitar contenido ya completado
2.3 Componentes de UI
Componente	Descripción
Lista de módulos	Vista principal con tarjetas por módulo, indicador de progreso, estado (completado/desbloqueado/bloqueado)
Barra de progreso global	Muestra módulos completados / 8 como porcentaje
Vista de detalle del módulo	Contenido completo: PDF, objetivos, conceptos, pasos, ejercicio, quiz
Quiz interactivo	Preguntas de opción múltiple con feedback visual (correcto/incorrecto)
Indicadores de estado	Iconos: ✅ completado, 🔓 desbloqueado, 🔒 bloqueado
3. Catálogo de Módulos
Módulo 1: Diagnóstico del Proceso Actual
Subtítulo: BPMN AS-IS: Order-to-Cash
Duración estimada: 2-3 horas
PDF: Modulo_1_Diagnostico.pdf
Objetivos:
Entender qué es un diagrama BPMN y cómo leerlo
Mapear tu proceso actual Order-to-Cash de principio a fin
Identificar los cuellos de botella y puntos de dolor
Documentar las ineficiencias y trabajo manual
Conceptos clave:
BPMN (Business Process Model and Notation) — Notación estándar para documentar procesos
Swimlanes — Representan las áreas/roles: Comercial, Operaciones, Monitoreo, Facturación, Finanzas
Actividades manuales vs. automatizadas
Puntos de decisión — Donde el proceso puede tomar diferentes caminos
Pasos prácticos:
Lee el BPMN AS-IS completo → Imprime el diagrama y ponlo en una pared visible
Marca los puntos de dolor → Lista al menos 10 puntos de dolor
Cuantifica el impacto → Crea tabla punto de dolor → impacto estimado
Valida con tu equipo → Agenda reunión de 1 hora con los líderes
Ejercicio: Taller de Validación del AS-IS — Imprimir BPMN en formato grande, reunir a Irhec, Nancy, Gerardo y coordinadores. Priorizar 5 problemas más críticos por consenso.
Entregable: Foto del BPMN con post-its + lista priorizada de problemas
Quiz (4 preguntas):
¿Qué significa BPMN? → Business Process Model and Notation
¿Qué representan los swimlanes? → Las áreas o roles que participan en el proceso
¿Cuál es el objetivo principal del diagnóstico AS-IS? → Mapear y entender el proceso actual con sus ineficiencias
¿Qué se debe hacer después de identificar los puntos de dolor? → Cuantificar su impacto en tiempo, personas y dinero
Módulo 2: Visión del Proceso Objetivo
Subtítulo: BPMN TO-BE: El Futuro Digitalizado
Duración estimada: 2 horas
PDF: Modulo_2_Vision_Proceso_Objetivo.pdf
Objetivos:
Comprender el proceso objetivo digitalizado y automatizado
Identificar las diferencias clave entre AS-IS y TO-BE
Entender el rol del TMS como eje central de la transformación
Visualizar cómo fluirá la información sin intervención manual
Conceptos clave:
Automatización end-to-end — El TMS como cerebro operativo
Integración de sistemas — TMS + Motive + App Operador + Dashboard
Eliminación de WhatsApp — Toda comunicación migra a la app
PODs digitales — Evidencias escaneadas en app, validadas automáticamente
Pasos prácticos:
Compara AS-IS vs TO-BE lado a lado → Tabla de 3 columnas: Actividad AS-IS → Cambio → Actividad TO-BE
Identifica las dependencias tecnológicas → Clasifica cambios en tecnológicos vs. organizacionales
Define quick wins → Lista 5 quick wins implementables en 2 semanas
Presenta la visión al equipo directivo → Agenda presentación con equipo directivo
Ejercicio: Sesión de Visión TO-BE — Presentar ambos BPMNs al equipo directivo.
Entregable: Minuta de reunión con compromisos por área
Quiz (3 preguntas):
¿Cuál es el rol del TMS en el proceso TO-BE? → Ser el cerebro operativo que conecta planificación, monitoreo, facturación y cobro
¿Qué son los PODs digitales? → Evidencias escaneadas en app y validadas automáticamente
¿Qué son los quick wins? → Cambios implementables rápidamente sin esperar al TMS
Módulo 3: Análisis de Brechas
Subtítulo: Los 18 Gaps entre el AS-IS y TO-BE
Duración estimada: 3 horas
PDF: Modulo_3_Analisis_Brechas.pdf
Objetivos:
Comprender cada uno de los 18 gaps identificados
Entender la priorización: CRÍTICO → ALTO → MEDIO → ESTRUCTURAL
Mapear la interdependencia entre gaps
Definir el orden de ataque óptimo
Conceptos clave:
Gap = Brecha — Diferencia medible entre cómo se hace algo hoy y cómo debería hacerse
Priorización por impacto — CRÍTICO afecta ingresos y clientes directamente
Interdependencia — Algunos gaps dependen de otros
Sprint mapping — Cada gap se ataca en sprints específicos
Pasos prácticos:
Estudia los 18 gaps → Lee el documento GAP Analysis completo
Mapea interdependencias → Crea diagrama de dependencias entre gaps
Asigna champions → Confirma o ajusta el champion de cada gap
Valida con datos → Crea dashboard con baseline de cada gap
Ejercicio: Workshop de Gaps con Coordinadores
Entregable: Matriz de gaps validada con firmas de champions
Quiz (4 preguntas):
¿Cuántos gaps se identificaron? → 18
¿Qué nivel de prioridad afecta directamente ingresos y clientes? → CRÍTICO
¿Qué es un champion? → El responsable asignado para cerrar un gap específico
¿Por qué mapear interdependencias? → Porque algunos gaps no pueden cerrarse sin cerrar otros primero
Módulo 4: KPIs y OKRs Estratégicos
Subtítulo: Métricas para Medir el Éxito
Duración estimada: 2 horas
PDF: Modulo_4_KPIs_OKRs.pdf
Objetivos:
Entender la diferencia entre KPI y OKR
Conocer las metas numéricas por sprint para cada KPI
Configurar la medición baseline vs. target
Vincular cada KPI a los gaps que lo impactan
Conceptos clave:
OKR — Objective (cualitativo) + Key Result (cuantitativo)
KPI — Indicador con baseline, target a 6, 12 y 18 meses
Leading vs Lagging indicators
Sprint targets — Metas incrementales por sprint
Pasos prácticos:
Entiende cada KPI → Lee la sección de KPIs del documento
Levanta el baseline → Formato para recolectar los 10 baselines
Configura el tracking → Calendario de medición de KPIs
Comunica las metas → Hoja de KPIs por persona/área
Ejercicio: Taller de Medición Baseline
Entregable: Dashboard de KPIs con valores baseline documentados
Quiz (3 preguntas):
¿Diferencia entre KPI y OKR? → KPI es indicador medible, OKR combina objetivo cualitativo con resultado cuantitativo
¿Qué es el baseline? → El valor actual antes de iniciar mejoras
¿Qué tipo de indicador predice resultados futuros? → Leading indicator
Módulo 5: Matriz RACI y Estructura Lean
Subtítulo: Quién Hace Qué — Roles Claros
Duración estimada: 3 horas
PDF: Modulo_5_RACI_Lean.pdf
Objetivos:
Comprender la Matriz RACI (Responsible, Accountable, Consulted, Informed)
Identificar roles duplicados y solapamientos
Diseñar la estructura organizacional lean propuesta
Planificar la comunicación de cambios organizacionales
Conceptos clave:
R (Responsible) — Quien ejecuta la tarea
A (Accountable) — Quien responde por el resultado (SOLO UNA persona)
C (Consulted) — A quién se le pide opinión antes de actuar
I (Informed) — A quién se le notifica después de actuar
Lean Structure — Eliminar redundancias, empoderar roles
Pasos prácticos:
Estudia la RACI propuesta → Lee la sección RACI del documento
Identifica conflictos → Marca conflictos en la matriz con color
Revisa la estructura lean → Lista de cambios organizacionales propuestos
Planifica la comunicación → Plan de comunicación de cambios
Ejercicio: Validación de RACI con Líderes (Irhec, Nancy, Gerardo)
Entregable: Matriz RACI aprobada con firmas + plan de comunicación
Quiz (4 preguntas):
¿Qué significa la 'A' en RACI? → Accountable — quien responde por el resultado
¿Cuántas personas deben ser Accountable por tarea? → Solo una
¿Qué busca una estructura Lean? → Eliminar redundancias y empoderar roles
¿Cómo se comunican los cambios de roles? → Individual → equipo → organización
Módulo 6: Metodología Ágil Aplicada
Subtítulo: Scrum Adaptado a Logística Farmacéutica
Duración estimada: 2 horas
PDF: Modulo_6_Metodologia_Agil.pdf
Objetivos:
Entender los principios de Scrum y cómo aplican al contexto
Conocer las ceremonias: Sprint Planning, Daily, Review, Retrospective
Definir los roles: Product Owner, Scrum Master, Team
Configurar el ritmo de sprints de 4 semanas
Conceptos clave:
Sprint — Período fijo de 4 semanas
Sprint Planning — Reunión al inicio para seleccionar stories
Daily Standup — 15 minutos diarios
Sprint Review — Demostración de lo logrado
Retrospective — ¿Qué salió bien? ¿Qué mejorar?
Pasos prácticos:
Define los roles Scrum → Product Owner, Scrum Master, Team
Configura las ceremonias → Crear invitaciones de calendario recurrentes
Prepara el Sprint Board → Demo del tablero Kanban al equipo
Establece la Definition of Done → Documentar y comunicar
Ejercicio: Primer Sprint Planning (Sprint 1)
Entregable: Sprint 1 backlog comprometido + fotos de la sesión
Quiz (4 preguntas):
¿Cuánto dura un Sprint? → 4 semanas
¿Cuánto debe durar el Daily Standup? → 15 minutos
¿Qué se hace en la Retrospective? → Revisar qué salió bien, qué mejorar y qué dejar de hacer
¿Quién es el Product Owner? → El dueño de la visión del producto
Módulo 7: User Stories y Backlog
Subtítulo: 46 Historias de Usuario Detalladas
Duración estimada: 3 horas
PDF: Modulo_7_User_Stories_Backlog.pdf
Objetivos:
Aprender a leer y escribir User Stories correctamente
Entender Story Points y estimación relativa
Comprender la priorización MoSCoW (Must, Should, Could, Won't)
Saber cómo refinar stories con el equipo
Conceptos clave:
User Story — "Como [rol], quiero [acción], para que [beneficio]"
Criterios de Aceptación — Condiciones para considerar Done
Story Points — Estimación relativa con Fibonacci: 1, 2, 3, 5, 8, 13
MoSCoW — Must, Should, Could, Won't
Refinement — Sesión de revisión, aclaración y estimación
Pasos prácticos:
Revisa el backlog completo → Marca las stories que no entiendas
Valida los Story Points → Sesión de Planning Poker con el equipo
Refina las stories del Sprint 1 → Refinement de 2 horas
Organiza el backlog → Ordenar por prioridad en la app Kanban
Ejercicio: Sesión de Refinement del Sprint 1
Entregable: Stories del Sprint 1 refinadas y listas para ejecución
Quiz (4 preguntas):
¿Formato correcto de una User Story? → "Como [rol], quiero [acción], para que [beneficio]"
¿Qué son los Story Points? → Estimación relativa de esfuerzo usando Fibonacci
¿Qué significa 'Must' en MoSCoW? → Es obligatorio implementarlo
¿Cuántas User Stories tiene el backlog? → 46
Módulo 8: Roadmap y Ejecución
Subtítulo: Plan de 18 Meses — ¡Arrancamos!
Duración estimada: 2 horas
PDF: Modulo_8_Roadmap_Ejecucion.pdf
Objetivos:
Visualizar el plan completo de 18 meses con hitos clave
Entender las 3 fases: Foundation (M1-6), Scale (M7-12), Optimize (M13-18)
Configurar el seguimiento semanal y mensual
Arrancar oficialmente el Sprint 1
Conceptos clave:
Fase 1: Foundation (Mes 1-6) — Cerrar gaps críticos
Fase 2: Scale (Mes 7-12) — Escalar soluciones
Fase 3: Optimize (Mes 13-18) — Optimizar con IA, mejora continua
Governance — Daily (15 min), Weekly review (1 hr), Monthly steering (2 hr)
Change Management — Comunicación, capacitación y quick wins
Pasos prácticos:
Revisa el roadmap completo → Imprime y ponlo visible en la oficina
Configura el governance → Estructura de governance compartida
Prepara el kick-off → Agenda reunión de lanzamiento
¡Arranca Sprint 1! → Envía correo de arranque oficial
Ejercicio: Kick-off de Transformación O2C (2 horas con todo el equipo)
Entregable: Fotos del kick-off + minuta + compromisos firmados
Quiz (4 preguntas):
¿Cuánto dura el plan completo? → 18 meses
¿Cuáles son las 3 fases? → Foundation, Scale, Optimize
¿Qué se hace en la fase Foundation? → Cerrar gaps críticos
¿Con qué frecuencia se hace el steering meeting? → Mensual
4. Modelo de Datos
4.1 Tabla: academy_progress
Almacena el progreso individual de cada usuario en la academia.

Columna	Tipo	Nullable	Default	Descripción
id	uuid	No	gen_random_uuid()	Identificador único del registro
user_id	uuid	No	—	ID del usuario (referencia a auth.users)
completed_modules	integer[]	No	'{}'	Array de IDs de módulos completados (ej: [1, 2, 3])
completed_steps	text[]	No	'{}'	Array de pasos completados en formato "moduleId-stepIndex" (ej: ["1-0", "1-1", "1-exercise"])
passed_quizzes	integer[]	No	'{}'	Array de IDs de módulos cuyo quiz fue aprobado (ej: [1, 2])
updated_at	timestamptz	No	now()	Última actualización del registro
Restricción: UNIQUE(user_id) — Un solo registro por usuario, se usa UPSERT para actualizar.

4.2 Políticas RLS (Row Level Security)
Política	Comando	Expresión
Users can view own progress	SELECT	user_id = auth.uid()
Users can insert own progress	INSERT	user_id = auth.uid()
Users can update own progress	UPDATE	user_id = auth.uid()
No se permite DELETE sobre esta tabla.

4.3 Lógica de Persistencia
// Hook: useAcademyProgress.ts

// LECTURA: Al montar el componente (o cambiar usuario)
const { data } = await supabase
  .from("academy_progress")
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle();

// ESCRITURA: En cada cambio (toggle paso, aprobar quiz, completar módulo)
await supabase
  .from("academy_progress")
  .upsert({
    user_id: user.id,
    completed_modules: [...modulesSet],
    completed_steps: [...stepsSet],
    passed_quizzes: [...quizzesSet],
  }, { onConflict: "user_id" });
4.4 Estructura del Estado en Frontend
// Sets para búsqueda O(1)
completedModules: Set<number>    // ej: Set([1, 2])
completedSteps: Set<string>      // ej: Set(["1-0", "1-1", "1-exercise", "2-0"])
passedQuizzes: Set<number>       // ej: Set([1, 2])
4.5 Formato de Identificadores de Pasos
Tipo	Formato	Ejemplo
Paso regular	{moduleId}-{stepIndex}	"1-0", "1-1", "1-2", "1-3"
Ejercicio	{moduleId}-exercise	"1-exercise"
5. Lógica de Desbloqueo
function isModuleUnlocked(moduleId: number): boolean {
  if (moduleId === 1) return true;
  return passedQuizzes.has(moduleId - 1) || completedModules.has(moduleId - 1);
}
Módulo	Condición de desbloqueo
1	Siempre desbloqueado
2	Quiz del Módulo 1 aprobado
3	Quiz del Módulo 2 aprobado
4	Quiz del Módulo 3 aprobado
5	Quiz del Módulo 4 aprobado
6	Quiz del Módulo 5 aprobado
7	Quiz del Módulo 6 aprobado
8	Quiz del Módulo 7 aprobado
6. Lógica de Quiz
function handleQuizSubmit(mod: LearningModule) {
  const allCorrect = mod.quiz.every(
    (q, i) => quizAnswers[i] === q.correct
  );

  if (allCorrect) {
    addPassedQuiz(mod.id);    // Marca quiz aprobado
    toggleModule(mod.id);      // Marca módulo completado
    // Avanza al siguiente módulo automáticamente
  }
  // Si no es 100%, muestra feedback y permite reintentar
}
7. Descarga de PDFs
Los PDFs se almacenan en /public/docs/ y se descargan mediante:

const link = document.createElement("a");
link.href = `/docs/${module.pdfName}`;
link.download = module.pdfName;
link.click();
Módulo	Archivo PDF
1	Modulo_1_Diagnostico.pdf
2	Modulo_2_Vision_Proceso_Objetivo.pdf
3	Modulo_3_Analisis_Brechas.pdf
4	Modulo_4_KPIs_OKRs.pdf
5	Modulo_5_RACI_Lean.pdf
6	Modulo_6_Metodologia_Agil.pdf
7	Modulo_7_User_Stories_Backlog.pdf
8	Modulo_8_Roadmap_Ejecucion.pdf
Adicionalmente existe: Instructivo_Plataforma_O2C.pdf (manual de usuario de la plataforma).

8. Stack Tecnológico
Componente	Tecnología
Frontend	React 18 + TypeScript + Vite 5
Estilos	Tailwind CSS v3 + shadcn/ui
Routing	React Router v6
Estado	React hooks (useState, useCallback, useRef)
Backend	Lovable Cloud (Supabase)
Base de datos	PostgreSQL con RLS
Autenticación	Supabase Auth (email + password, auto-confirm habilitado)
Persistencia	useAcademyProgress hook con upsert a academy_progress
9. Archivos del Proyecto Relacionados
Archivo	Función
src/pages/Learn.tsx	Página principal de la Academia: lista de módulos, vista de detalle, quiz
src/hooks/useAcademyProgress.ts	Hook de persistencia: carga/guarda progreso en base de datos
src/contexts/AuthContext.tsx	Contexto de autenticación: usuario actual, login, logout
src/pages/Auth.tsx	Página de login/registro
public/docs/*.pdf	8 PDFs de módulos + 1 instructivo de plataforma