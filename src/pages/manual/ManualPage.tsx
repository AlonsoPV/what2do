import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Columns3,
  FileBarChart,
  HelpCircle,
  Layers3,
  Lightbulb,
  LineChart,
  Route,
  Settings,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/constants'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { canAccessRouteByRole } from '@/features/auth/lib/permissions'

type ManualSection = {
  title: string
  route: string
  icon: typeof BookOpen
  value: string
  content: string
  useCases: string[]
  tips: string[]
}

const manualSections: ManualSection[] = [
  {
    title: 'Dashboard',
    route: ROUTES.DASHBOARD,
    icon: BarChart3,
    value: 'Da una lectura rapida del pulso operativo del dia.',
    content:
      'Concentra acciones visibles, avance operativo, score global O2C y semaforo KPI. Es la primera vista para saber que esta estable, que requiere atencion y donde conviene entrar al detalle.',
    useCases: [
      'Revisar acciones totales, completadas, bloqueadas y pendientes de evidencia.',
      'Entender el score global O2C y su evolucion reciente.',
      'Detectar KPIs fuera de meta sin abrir reportes separados.',
    ],
    tips: [
      'Usa filtros para mirar un dia, responsable, area o prioridad especifica.',
      'Si una metrica se ve mal, baja al control de acciones antes de concluir la causa.',
    ],
  },
  {
    title: 'Kanban',
    route: ROUTES.KANBAN,
    icon: Columns3,
    value: 'Convierte el seguimiento en ejecucion visible.',
    content:
      'Organiza las acciones por estado y permite revisar responsables, prioridades, vencimientos, comentarios, checklist y evidencias. Es la vista de trabajo diario para mover acciones hasta cierre y verificacion.',
    useCases: [
      'Crear, editar y dar seguimiento a acciones operativas.',
      'Identificar bloqueos, retrasos y proximos vencimientos.',
      'Revisar el mismo trabajo en vista tablero o en tabla.',
    ],
    tips: [
      'Mantén cada accion con responsable, fecha limite, prioridad y evidencia esperada.',
      'No cierres una accion si falta la evidencia que confirma el resultado.',
    ],
  },
  {
    title: 'KPIs O2C',
    route: ROUTES.DASHBOARD_KPIS,
    icon: LineChart,
    value: 'Explica si el proceso mejora contra metas medibles.',
    content:
      'Muestra el portafolio de indicadores O2C, su valor actual, meta, cumplimiento, peso, tendencia y semaforo. Ayuda a separar actividad de resultado: una accion puede avanzar, pero el KPI solo mejora cuando se registra o actualiza la medicion correspondiente.',
    useCases: [
      'Ver que indicadores estan en meta, en riesgo o fuera de meta.',
      'Comparar avance por area, responsable, horizonte y peso del portafolio.',
      'Registrar mediciones para mantener vigente el calculo de cumplimiento.',
    ],
    tips: [
      'Lee primero el semaforo y luego abre el detalle del KPI que tenga mayor peso.',
      'Recuerda que las acciones vinculadas dan contexto, pero no recalculan por si solas el KPI.',
    ],
  },
  {
    title: 'Gaps O2C',
    route: ROUTES.DASHBOARD_GAPS,
    icon: Layers3,
    value: 'Traduce las brechas del proceso en avance ejecutable.',
    content:
      'Agrupa las brechas operativas y muestra su avance por story points, acciones relacionadas, responsable, estado y KPIs vinculados. Sirve para entender que esta cerrando la brecha entre la situacion actual y la meta.',
    useCases: [
      'Priorizar brechas con mayor impacto sobre el portafolio O2C.',
      'Ver si las acciones realmente estan empujando el cierre del gap.',
      'Conectar brechas con KPIs para explicar causa, accion y resultado.',
    ],
    tips: [
      'Un gap con muchas acciones pero poco avance necesita limpieza de alcance o desbloqueo.',
      'Usa los KPIs vinculados para saber si el avance operativo ya se refleja en resultado.',
    ],
  },
  {
    title: 'Matriz de Impacto',
    route: ROUTES.DASHBOARD_IMPACTO,
    icon: Target,
    value: 'Ayuda a decidir donde enfocar energia primero.',
    content:
      'Cruza acciones, gaps y KPIs para leer impacto esperado. Es util para ordenar prioridades cuando hay muchas iniciativas compitiendo por tiempo, recursos o atencion directiva.',
    useCases: [
      'Comparar iniciativas por impacto operativo y relacion con KPIs.',
      'Detectar acciones que aportan poco frente al esfuerzo requerido.',
      'Preparar decisiones de priorizacion con una base comun.',
    ],
    tips: [
      'Prioriza lo que mueve KPIs criticos y desbloquea gaps relevantes.',
      'Evita saturar al equipo con acciones de bajo impacto solo porque son faciles.',
    ],
  },
  {
    title: 'Disciplina',
    route: ROUTES.DISCIPLINA,
    icon: ShieldCheck,
    value: 'Mide consistencia en ejecucion, no solo intencion.',
    content:
      'Da seguimiento a habitos operativos como cierre de acciones, carga de evidencia, seguimiento a pendientes y registro oportuno. Es una vista para mejorar confiabilidad del sistema.',
    useCases: [
      'Ver cumplimiento de rutinas por usuario o equipo.',
      'Detectar comportamientos que afectan calidad del dato.',
      'Dar retroalimentacion sobre uso del tablero.',
    ],
    tips: [
      'Una buena disciplina mantiene el tablero confiable para tomar decisiones.',
      'Si la informacion no se actualiza, el tablero deja de reflejar la realidad.',
    ],
  },
  {
    title: 'Calendario',
    route: ROUTES.CALENDARIO,
    icon: CalendarDays,
    value: 'Ordena compromisos y fechas clave.',
    content:
      'Permite revisar vencimientos y eventos asociados al seguimiento operativo. Ayuda a anticipar cargas de trabajo y evitar que las acciones se atiendan hasta que ya estan vencidas.',
    useCases: [
      'Visualizar fechas limite de acciones.',
      'Preparar la agenda de seguimiento semanal.',
      'Ubicar compromisos proximos por responsable o prioridad.',
    ],
    tips: [
      'Revisa vencimientos antes de cerrar la planeacion diaria.',
      'Si una accion no tiene fecha clara, dificilmente sera gestionable.',
    ],
  },
  {
    title: 'Reportes',
    route: ROUTES.REPORTES,
    icon: FileBarChart,
    value: 'Convierte seguimiento operativo en comunicacion ejecutiva.',
    content:
      'Reune informacion historica y salidas para compartir avances. Su proposito es contar una historia clara: que cambio, que sigue en riesgo y que decisiones se necesitan.',
    useCases: [
      'Preparar cortes de avance para comites.',
      'Consultar historico de reportes y resultados.',
      'Documentar decisiones y aprendizajes del ciclo.',
    ],
    tips: [
      'Un buen reporte no solo lista datos: explica implicaciones y siguientes decisiones.',
      'Acompana cada riesgo con responsable y fecha de accion.',
    ],
  },
  {
    title: 'Notificaciones',
    route: ROUTES.NOTIFICACIONES,
    icon: Bell,
    value: 'Mantiene visibles alertas y cambios importantes.',
    content:
      'Centraliza avisos sobre acciones, vencimientos, comentarios o eventos relevantes. Ayuda a que el equipo no dependa solo de reuniones para enterarse de lo importante.',
    useCases: [
      'Revisar cambios que requieren atencion.',
      'Entrar rapido a una accion mencionada en una alerta.',
      'Distinguir pendientes leidos de no leidos.',
    ],
    tips: [
      'Atiende primero notificaciones vinculadas a bloqueos o vencimientos.',
      'Mantener la bandeja limpia ayuda a no perder alertas criticas.',
    ],
  },
  {
    title: 'Distancias',
    route: ROUTES.DISTANCIAS,
    icon: Route,
    value: 'Apoya calculos logisticos de ruta y duracion.',
    content:
      'Permite consultar distancias, tiempos estimados y rutas guardadas para decisiones operativas. Es util cuando el proceso O2C depende de origen, destino, traslado o compromisos de entrega.',
    useCases: [
      'Calcular una ruta nueva entre origen y destino.',
      'Reutilizar rutas frecuentes guardadas.',
      'Soportar decisiones con duracion y distancia estimadas.',
    ],
    tips: [
      'Guarda rutas recurrentes para evitar capturas repetidas.',
      'Usa el resultado como referencia operativa, no como sustituto de validacion logistica.',
    ],
  },
  {
    title: 'Configuracion',
    route: ROUTES.SETTINGS,
    icon: Settings,
    value: 'Administra usuarios, catalogos y reglas base del tablero.',
    content:
      'Concentra ajustes de perfil, usuarios, areas, roles, prioridades, estatus, dropdowns, KPIs y gaps. Debe usarse con cuidado porque alimenta las opciones y calculos que ven los demas modulos.',
    useCases: [
      'Actualizar datos de usuarios y permisos.',
      'Mantener catalogos activos, claros y sin duplicados.',
      'Administrar KPIs y gaps que soportan el modelo O2C.',
    ],
    tips: [
      'Antes de desactivar un catalogo, confirma que no afecte reportes o acciones abiertas.',
      'Nombra KPIs y gaps de forma entendible para usuarios no tecnicos.',
    ],
  },
]

const operatingFlow = [
  {
    title: '1. Mira el pulso',
    text: 'Entra al Dashboard para ubicar volumen de acciones, bloqueos, evidencia pendiente, score global y semaforo KPI.',
  },
  {
    title: '2. Baja a la ejecucion',
    text: 'Abre Kanban para revisar responsables, estados, vencimientos, checklist, comentarios y evidencias.',
  },
  {
    title: '3. Conecta con resultado',
    text: 'Consulta KPIs O2C y Gaps O2C para saber si la actividad operativa esta cerrando brechas y moviendo indicadores.',
  },
  {
    title: '4. Prioriza y comunica',
    text: 'Usa Alineacion estrategica, Matriz de Impacto y Reportes para enfocar decisiones y explicar avances.',
  },
]

const glossary = [
  {
    term: 'Accion',
    definition: 'Trabajo concreto con responsable, fecha, prioridad, estado y evidencia esperada.',
  },
  {
    term: 'Gap',
    definition: 'Brecha entre la situacion actual del proceso y el nivel objetivo que se quiere alcanzar.',
  },
  {
    term: 'KPI',
    definition: 'Indicador cuantitativo que mide desempeno contra una meta definida.',
  },
  {
    term: 'Score global O2C',
    definition: 'Promedio ponderado del cumplimiento de KPIs elegibles del portafolio.',
  },
  {
    term: 'Semaforo',
    definition: 'Clasificacion visual del cumplimiento: en meta, en riesgo o fuera de meta.',
  },
  {
    term: 'Story points',
    definition: 'Unidad de esfuerzo usada para medir avance relativo de acciones y gaps.',
  },
  {
    term: 'Evidencia',
    definition: 'Archivo, comentario o confirmacion que respalda que una accion fue realizada.',
  },
  {
    term: 'Responsable',
    definition: 'Persona encargada de ejecutar, actualizar o destrabar una accion, KPI o gap.',
  },
]

export function ManualPage() {
  const { data: currentUser } = useCurrentUser()
  const visibleSections = manualSections.filter((section) =>
    canAccessRouteByRole(currentUser?.rol, section.route)
  )
  const flowSteps = operatingFlow

  return (
    <div id="manual-page" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-5 sm:px-6 sm:py-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Manual del tablero
          </Badge>
          <Badge variant="outline">Operacion O2C</Badge>
        </div>
        <div className="max-w-4xl space-y-3">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Guia clara para entender y operar el tablero
          </h1>
          <p className="text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            Esta seccion explica para que sirve cada modulo, que informacion muestra y como usarlo en la
            gestion diaria. La idea es simple: ver el pulso, ejecutar acciones, conectar con KPIs y comunicar
            decisiones con evidencia.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Flujo recomendado">
        {flowSteps.map((step) => (
          <Card key={step.title} className="rounded-lg shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-sm leading-6 text-muted-foreground">{step.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="manual-sections-title">
        <div className="max-w-3xl space-y-2">
          <h2 id="manual-sections-title" className="text-2xl font-semibold tracking-tight">
            Secciones del tablero
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Cada modulo tiene un papel dentro del ciclo de gestion: diagnosticar, ejecutar, medir, aprender y
            reportar. Usa esta guia como mapa rapido cuando un usuario nuevo necesite ubicarse.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {visibleSections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.title} className="rounded-lg shadow-sm">
                <CardHeader className="gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-lg leading-6">{section.title}</CardTitle>
                      <CardDescription className="leading-6">{section.value}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 pt-0">
                  <p className="text-sm leading-6 text-muted-foreground">{section.content}</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
                        Para que usarlo
                      </h3>
                      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                        {section.useCases.map((item) => (
                          <li key={item} className="flex gap-2">
                            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden />
                        Buen uso
                      </h3>
                      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                        {section.tips.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    to={section.route}
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    Abrir {section.title}
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" aria-label="Criterios de lectura">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
              Como interpretar el tablero
            </CardTitle>
            <CardDescription>
              Tres reglas practicas para evitar lecturas equivocadas y tomar mejores decisiones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 pt-0 text-sm leading-6 text-muted-foreground">
            <p>
              <strong className="text-foreground">Accion no es resultado.</strong> Una accion cerrada indica
              ejecucion; el KPI confirma si esa ejecucion mejoro el desempeno.
            </p>
            <p>
              <strong className="text-foreground">El gap explica la brecha.</strong> Si un KPI esta fuera de
              meta, busca el gap relacionado para entender que capacidad, proceso o disciplina falta cerrar.
            </p>
            <p>
              <strong className="text-foreground">La evidencia protege la confianza.</strong> Sin evidencia,
              comentario o medicion, el tablero pierde valor como fuente para decisiones ejecutivas.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader className="p-5">
            <CardTitle className="text-lg">Glosario rapido</CardTitle>
            <CardDescription>Terminos frecuentes del tablero explicados sin tecnicismos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 pt-0 sm:grid-cols-2 lg:grid-cols-1">
            {glossary.map((item) => (
              <div key={item.term} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-semibold text-foreground">{item.term}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.definition}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
