
<h2 class="sr-only">Plan de acción de 6 meses para convertirse en Scrum Master consultor, organizado en tres pistas paralelas: capacitación, optimización del tablero y entendimiento de la empresa.</h2>
<style>
*{box-sizing:border-box;margin:0;padding:0}
.root{padding:1rem 0 2rem;font-family:var(--font-sans);color:var(--color-text-primary)}
.track-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1.5rem}
.tnav{font-size:12px;padding:5px 14px;border-radius:20px;border:0.5px solid var(--color-border-secondary);cursor:pointer;color:var(--color-text-secondary);background:var(--color-background-primary);transition:all .15s}
.tnav.on{color:#3C3489;border-color:#AFA9EC;background:#EEEDFE}
.tnav.on.t2{color:#085041;border-color:#5DCAA5;background:#E1F5EE}
.tnav.on.t3{color:#633806;border-color:#EF9F27;background:#FAEEDA}
.pane{display:none}
.pane.on{display:block}
.sprint-row{display:flex;flex-direction:column;gap:10px;margin-bottom:10px}
.card{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;background:var(--color-background-primary)}
.card-head{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .12s}
.card-head:hover{background:var(--color-background-secondary)}
.week-badge{font-size:11px;font-weight:500;padding:2px 8px;border-radius:12px;flex-shrink:0}
.card-title{font-size:13px;font-weight:500;flex:1;color:var(--color-text-primary)}
.tag{font-size:10px;padding:2px 7px;border-radius:10px;border:0.5px solid var(--color-border-tertiary);color:var(--color-text-secondary);white-space:nowrap}
.chev{font-size:13px;color:var(--color-text-secondary);transition:transform .2s;flex-shrink:0}
.chev.op{transform:rotate(180deg)}
.card-body{display:none;padding:14px;border-top:0.5px solid var(--color-border-tertiary)}
.card-body.op{display:block}
.lbl{font-size:10px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;margin-top:12px}
.lbl:first-child{margin-top:0}
.res{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--color-border-tertiary)}
.res:last-child{border-bottom:none}
.ri{font-size:15px;color:var(--color-text-secondary);margin-top:1px;flex-shrink:0}
.rm{flex:1;min-width:0}
.rn{font-size:13px;color:var(--color-text-primary)}
.ru{font-size:11px;color:var(--color-text-info);word-break:break-all}
.rk{font-size:11px;color:var(--color-text-secondary);margin-top:2px}
.task{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:0.5px solid var(--color-border-tertiary)}
.task:last-child{border-bottom:none}
.dot{width:6px;height:6px;border-radius:50%;margin-top:5px;flex-shrink:0}
.ttext{font-size:13px;color:var(--color-text-primary);line-height:1.45}
.tbox{margin-top:10px;padding:10px 12px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary)}
.tbox-lbl{font-size:10px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
.tbox-txt{font-size:12px;color:var(--color-text-primary);line-height:1.5}
.dbox{margin-top:10px;padding:8px 12px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-success);background:var(--color-background-success)}
.dlbl{font-size:10px;font-weight:500;color:var(--color-text-success);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
.dtxt{font-size:12px;color:var(--color-text-success);line-height:1.4}
.rule-box{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:12px 14px;margin-bottom:10px;background:var(--color-background-secondary)}
.rule-title{font-size:13px;font-weight:500;color:var(--color-text-primary);margin-bottom:4px}
.rule-txt{font-size:12px;color:var(--color-text-secondary);line-height:1.5}
.phase-label{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em;padding:8px 0 6px;border-bottom:0.5px solid var(--color-border-tertiary);margin-bottom:8px}
</style>

<div class="root">

<div class="track-nav">
  <button class="tnav on t1" onclick="show(0)"><i class="ti ti-school" aria-hidden="true"></i> Capacitación</button>
  <button class="tnav t2" onclick="show(1)"><i class="ti ti-device-desktop" aria-hidden="true"></i> Tablero</button>
  <button class="tnav t3" onclick="show(2)"><i class="ti ti-building-factory" aria-hidden="true"></i> Empresa</button>
</div>

<div id="p0" class="pane on">
  <div class="phase-label">Pista 1 — Capacitación · 6 meses · 100% recursos gratuitos</div>
  <div class="sprint-row">

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#EEEDFE;color:#3C3489;">Mes 1</span>
        <span class="card-title">Scrum — fundamentos y certificación PSM I</span>
        <span class="tag">Scrum</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Recursos gratuitos — en este orden</div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">Scrum Guide 2020 — documento oficial</div><div class="ru">scrumguides.org → descargar PDF en español</div><div class="rk">11 páginas. Leer día 1 completo. Releer día 4 subrayando. Releer día 10 sin subrayar para medir retención.</div></div></div>
        <div class="res"><i class="ti ti-external-link ri" aria-hidden="true"></i><div class="rm"><div class="rn">Mikhail Lapshin — Open Assessment gratuito</div><div class="ru">mlapshin.com/p/scrum-quiz</div><div class="rk">Hacer el quiz diario. Meta: 95%+ antes del examen. Anotar preguntas fallidas y releer esa sección.</div></div></div>
        <div class="res"><i class="ti ti-external-link ri" aria-hidden="true"></i><div class="rm"><div class="rn">Scrum.org — Open Assessment oficial</div><div class="ru">scrum.org/open-assessments/scrum-open</div><div class="rk">Simulacro gratuito. Hacer 3 veces por semana. Mismo formato que el examen real.</div></div></div>
        <div class="res"><i class="ti ti-brand-youtube ri" aria-hidden="true"></i><div class="rm"><div class="rn">Agile Coach — Scrum en 20 minutos (YouTube)</div><div class="ru">youtube.com → buscar "Scrum en 20 minutos Agile Coach"</div><div class="rk">Video de refuerzo visual. Ver después de la primera lectura del Scrum Guide.</div></div></div>
        <div class="lbl">Tareas de la semana</div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 1–2: leer Scrum Guide + quiz diario + mapear conceptos a tu realidad (backlog = gaps priorizados, sprint = 2 semanas de acciones, DoD = acción Verificada + evidencia)</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 3: mock exam en scrum.org hasta 85%+ sostenido por 3 días seguidos</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 4: presentar al dueño cómo Scrum aplica en el tablero — 15 min con diapositivas</span></div>
        <div class="tbox"><div class="tbox-lbl">Conexión con el tablero</div><div class="tbox-txt">El kanban ya es un tablero Scrum incompleto. Tu trabajo este mes: definir la cadencia de sprint (cada cuánto se hace planning, review y retro usando el tablero como soporte).</div></div>
        <div class="dbox"><div class="dlbl">Entregable mes 1</div><div class="dtxt">Examen PSM I completado (scrum.org, $150 USD — única inversión del plan). Meta: score ≥ 85%. + Documento "Cómo usamos Scrum en el tablero" (1 página).</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#EEEDFE;color:#3C3489;">Mes 2</span>
        <span class="card-title">BPMN — modelado de procesos desde cero</span>
        <span class="tag">BPMN</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Recursos gratuitos</div>
        <div class="res"><i class="ti ti-video ri" aria-hidden="true"></i><div class="rm"><div class="rn">Camunda Academy — BPMN 2.0 Tutorial</div><div class="ru">academy.camunda.com → registro gratis</div><div class="rk">Módulos 1–6: eventos, tareas, gateways, pools, subprocesos. 2 módulos por día, tomar notas a mano.</div></div></div>
        <div class="res"><i class="ti ti-external-link ri" aria-hidden="true"></i><div class="rm"><div class="rn">bpmn.io — modelador gratuito en browser</div><div class="ru">bpmn.io</div><div class="rk">Sin instalación. Exporta XML, SVG y PNG. Usar para todos los diagramas del mes.</div></div></div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">OMG BPMN Quick Reference (PDF oficial)</div><div class="ru">omg.org/spec/BPMN → descargar Quick Reference</div><div class="rk">Imprimir. Es el glosario oficial — tenerlo al lado mientras practicas.</div></div></div>
        <div class="lbl">Un proceso por semana (aplicados a la empresa)</div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 1: modelar "Capturar evidencia en sitio" (GAP-04) — solo tareas y secuencias básicas</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 2: modelar "Facturar automáticamente" (GAP-07) con pools y manejo de errores</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 3: modelar "Planear y asignar viaje" (GAP-01) con subprocesos colapsados</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 4: construir el flujo O2C maestro con los 8 procesos core como subprocesos</span></div>
        <div class="tbox"><div class="tbox-lbl">Conexión con el tablero</div><div class="tbox-txt">Cada diagrama AS-IS se adjunta como evidencia en el gap correspondiente del tablero. El flujo O2C maestro es la documentación visual de por qué existen los 11 gaps.</div></div>
        <div class="dbox"><div class="dlbl">Entregable mes 2</div><div class="dtxt">4 diagramas BPMN de procesos reales de la empresa + flujo O2C maestro — presentados y validados con el dueño.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#EEEDFE;color:#3C3489;">Mes 3</span>
        <span class="card-title">Lean — eliminación de desperdicio y value stream mapping</span>
        <span class="tag">Lean</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Recursos gratuitos</div>
        <div class="res"><i class="ti ti-brand-youtube ri" aria-hidden="true"></i><div class="rm"><div class="rn">Lean Enterprise Institute — VSM tutorial (YouTube)</div><div class="ru">youtube.com → buscar "Value Stream Mapping LEI"</div><div class="rk">Video de 45 min. Es el estándar. Ver tomando notas sobre los 8 desperdicios Lean.</div></div></div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">Toyota Production System — resumen gratuito</div><div class="ru">getabstract.com → registro gratis, 5 resúmenes/mes</div><div class="rk">Base conceptual de Lean. Leer el resumen en GetAbstract (20 min).</div></div></div>
        <div class="res"><i class="ti ti-external-link ri" aria-hidden="true"></i><div class="rm"><div class="rn">Miro — plantilla VSM gratuita</div><div class="ru">miro.com/templates → buscar "Value Stream Map"</div><div class="rk">Usar para construir el VSM del proceso O2C. Cuenta básica gratis.</div></div></div>
        <div class="lbl">Aplicación directa a la empresa</div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 1–2: identificar los 8 desperdicios Lean en el flujo O2C de la empresa (sobreproducción, espera, transporte, defectos, inventario, movimiento, sobreprocesamiento, talento no utilizado)</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 3: construir el Value Stream Map del proceso con mayor desperdicio — probablemente facturación o evidencias</span></div>
        <div class="task"><span class="dot" style="background:#534AB7"></span><span class="ttext">Semana 4: presentar el VSM al dueño y proponer 3 mejoras concretas como acciones en el tablero</span></div>
        <div class="dbox"><div class="dlbl">Entregable mes 3</div><div class="dtxt">VSM del proceso O2C + mapa de desperdicios + 3 acciones Lean creadas en el tablero con su gap vinculado.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Mes 4</span>
        <span class="card-title">Agile avanzado — Kanban, OKRs y diseño TO-BE</span>
        <span class="tag">Agile · OKRs</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Recursos gratuitos</div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">Kanban Guide — documento oficial (gratis)</div><div class="ru">kanbanguides.org → descargar PDF</div><div class="rk">Complemento de Scrum. Leer completo (8 páginas). Identificar diferencias con el tablero actual.</div></div></div>
        <div class="res"><i class="ti ti-brand-youtube ri" aria-hidden="true"></i><div class="rm"><div class="rn">John Doerr — OKRs Ted Talk</div><div class="ru">youtube.com → buscar "John Doerr OKR Ted Talk"</div><div class="rk">18 min. Ver 2 veces. Estructura: Objetivo + 3 Key Results medibles. Aplicar a los FCE de la empresa.</div></div></div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">IDEO Method Cards — Design Thinking</div><div class="ru">ideo.com/post/method-cards → solicitar PDF gratis</div><div class="rk">Para diseñar procesos TO-BE. Usar tarjetas "Activity analysis" y "Rapid prototyping".</div></div></div>
        <div class="lbl">Entregables del mes</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Redactar 3 OKRs para la empresa: uno por FCE prioritario, con Key Results directamente desde los KPIs del tablero</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Producir documentos AS-IS / TO-BE de los 3 gaps con mayor impacto (GAP-04, GAP-07, GAP-01)</span></div>
        <div class="tbox"><div class="tbox-lbl">Conexión con el tablero</div><div class="tbox-txt">Los Key Results de los OKRs son los KPIs que ya existen en el tablero. El TO-BE de cada gap se convierte en la descripción formal del gap. Las acciones del kanban son el camino del AS-IS al TO-BE.</div></div>
        <div class="dbox"><div class="dlbl">Entregable mes 4</div><div class="dtxt">3 OKRs redactados + 3 documentos AS-IS/TO-BE en BPMN — listos para presentar al equipo directivo.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Mes 5</span>
        <span class="card-title">North Star y planeación estratégica aplicada</span>
        <span class="tag">Estrategia</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Recursos gratuitos</div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">Scaling Up — One Page Strategic Plan template</div><div class="ru">scalingup.com/resources → descargar OPSP gratis</div><div class="rk">Marco más usado en Latam para empresas medianas. Llenar con los datos reales de la empresa.</div></div></div>
        <div class="res"><i class="ti ti-brand-youtube ri" aria-hidden="true"></i><div class="rm"><div class="rn">Amplitude — North Star Metric explained</div><div class="ru">youtube.com → buscar "North Star Metric Amplitude"</div><div class="rk">Video de 20 min. El North Star es el único número que más importa. Identificarlo para la empresa.</div></div></div>
        <div class="res"><i class="ti ti-file ri" aria-hidden="true"></i><div class="rm"><div class="rn">Good Strategy Bad Strategy — resumen</div><div class="ru">getabstract.com → buscar "Good Strategy Bad Strategy Rumelt"</div><div class="rk">Leer el resumen. Anotar qué es el kernel de una buena estrategia: diagnóstico + política guía + acciones coherentes.</div></div></div>
        <div class="lbl">Tareas</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Identificar la North Star Metric de la empresa (el número que mejor representa entrega de valor al cliente — probablemente "% entregas perfectas a tiempo")</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Completar el OPSP con los 8 FCE como "capacidades a construir" y los 11 gaps como "brechas a cerrar"</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Redactar el kernel estratégico de la empresa en 1 párrafo usando lenguaje Rumelt</span></div>
        <div class="dbox"><div class="dlbl">Entregable mes 5</div><div class="dtxt">North Star Metric definida + One Page Strategic Plan completado + kernel estratégico — presentado al dueño para validación.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#FAEEDA;color:#633806;">Mes 6</span>
        <span class="card-title">Facilitación ejecutiva — conducir sesiones estratégicas</span>
        <span class="tag">Facilitación</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Recursos gratuitos</div>
        <div class="res"><i class="ti ti-brand-youtube ri" aria-hidden="true"></i><div class="rm"><div class="rn">AJ&Smart — Facilitation Fundamentals (YouTube)</div><div class="ru">youtube.com/@AJandSmart → playlist "Facilitation"</div><div class="rk">Ver los primeros 5 videos (~60 min total). Los más prácticos disponibles gratis.</div></div></div>
        <div class="res"><i class="ti ti-external-link ri" aria-hidden="true"></i><div class="rm"><div class="rn">Miro — plantillas de strategic review (gratis)</div><div class="ru">miro.com/templates → buscar "Strategic planning"</div><div class="rk">Usar para preparar la agenda visual de las sesiones mensuales con el dueño.</div></div></div>
        <div class="lbl">Agenda estándar de sesión mensual (90 min)</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Min 0–15: revisión del score global y semáforo KPI en el tablero — tú presentas, el dueño reacciona</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Min 15–45: revisión de los 3 gaps prioritarios con sus documentos AS-IS/TO-BE</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Min 45–75: priorización de acciones usando la Matriz de Impacto del tablero</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Min 75–90: compromisos escritos — quién hace qué, creados como acciones en el tablero</span></div>
        <div class="dbox"><div class="dlbl">Entregable mes 6</div><div class="dtxt">Primera sesión ejecutiva facilitada + acta de compromisos + agenda estandarizada para sesiones futuras.</div></div>
      </div>
    </div>

  </div>
</div>

<div id="p1" class="pane">
  <div class="phase-label">Pista 2 — Optimización del tablero · paralelo a la capacitación</div>
  <div class="sprint-row">

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Sprint 1</span>
        <span class="card-title">Modelar las ceremonias Scrum dentro del tablero</span>
        <span class="tag">Mes 1</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Qué implementar</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Definir la cadencia de sprint: cada 2 semanas, con fecha fija de planning (lunes) y review (viernes)</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Crear un campo "sprint" en acciones para agrupar las acciones del sprint actual en el kanban</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Definir la Definition of Done del equipo: acción en estado "Verificado" + evidencia cargada + KPI medido</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Crear una vista de "Sprint Goal" visible en el dashboard principal que muestre el objetivo del sprint activo</span></div>
        <div class="dbox"><div class="dlbl">Instrucción para Cursor</div><div class="dtxt">Agregar campo "sprint_id" a acciones_diarias + vista de sprint goal en el dashboard principal. Pedir la instrucción detallada cuando estés listo.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Sprint 2</span>
        <span class="card-title">Agregar documentación BPMN por gap</span>
        <span class="tag">Mes 2</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Qué implementar</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Agregar campo "diagrama_bpmn_url" a la tabla gaps en Supabase para adjuntar el PNG del proceso</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">En la GapCard del tablero, mostrar un botón "Ver proceso BPMN" que abra el diagrama en modal</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Agregar campo "proceso_as_is" y "proceso_to_be" como texto en la descripción del gap</span></div>
        <div class="dbox"><div class="dlbl">Instrucción para Cursor</div><div class="dtxt">Migración SQL + componente BpmnViewer en GapCard. Pedir la instrucción detallada cuando estés listo.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Sprint 3</span>
        <span class="card-title">Dashboard de Lean — desperdicios y VSM live</span>
        <span class="tag">Mes 3</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Qué implementar</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Agregar etiqueta de "tipo de desperdicio Lean" a las acciones (espera, defecto, sobreproducción, etc.)</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Vista de resumen en dashboard/gaps: conteo de acciones por tipo de desperdicio Lean</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Indicador de "tiempo de ciclo" por proceso: días promedio desde creación hasta "Verificado"</span></div>
        <div class="dbox"><div class="dlbl">Instrucción para Cursor</div><div class="dtxt">Campo desperdicio_lean en acciones + sección de análisis Lean en dashboard/gaps. Pedir instrucción cuando estés listo.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Sprint 4</span>
        <span class="card-title">North Star Metric en el dashboard ejecutivo</span>
        <span class="tag">Mes 5</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Qué implementar</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Agregar un widget de "North Star" en la parte superior del dashboard principal — el único número más importante</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">El North Star debe mostrarse con su tendencia (última semana vs semana anterior) y el % de meta</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Agregar tabla de configuración en /estrategia para que el dueño pueda definir qué KPI es el North Star</span></div>
        <div class="dbox"><div class="dlbl">Instrucción para Cursor</div><div class="dtxt">Tabla north_star_config en Supabase + widget en dashboard principal. Pedir instrucción cuando estés listo.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#E1F5EE;color:#085041;">Sprint 5</span>
        <span class="card-title">Módulo de capacitación integrado al tablero</span>
        <span class="tag">Mes 6</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Qué implementar</div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Página /capacitacion con los conceptos clave de Scrum, Lean y BPMN explicados en el contexto de la empresa</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Glosario interactivo: cada término del tablero (gap, KPI, story point, FCE) con su definición y ejemplo real</span></div>
        <div class="task"><span class="dot" style="background:#1D9E75"></span><span class="ttext">Guía de ceremonias: cómo hacer la planning, review y retro usando el tablero — con agenda y preguntas guía</span></div>
        <div class="dbox"><div class="dlbl">Instrucción para Cursor</div><div class="dtxt">Página /capacitacion con contenido estático + glosario interactivo. Pedir instrucción cuando estés listo.</div></div>
      </div>
    </div>

  </div>
</div>

<div id="p2" class="pane">
  <div class="phase-label">Pista 3 — Entender la empresa · proceso continuo desde el día 1</div>
  <div class="sprint-row">

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#FAEEDA;color:#633806;">Sem 1–2</span>
        <span class="card-title">Discovery operativo en oficina — entender sin salir a ruta</span>
        <span class="tag">Discovery</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Actividades concretas</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Hacer 4 entrevistas de discovery en oficina, 45 min cada una: tráfico, operador o supervisor, facturación y cobranza. Objetivo: entender GAP-01, GAP-03, GAP-04 y GAP-07 sin salir a ruta.</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Facilitar un walkthrough de 60 min con pantalla compartida: desde asignación del viaje hasta evidencia, facturación y cobranza. Pedir que narren qué sistema usan, qué dato capturan, dónde se atoran y qué retrabajo aparece.</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Revisar 5 casos reales desde oficina: 2 viajes perfectos, 2 con incidencia y 1 con problema de factura o cobranza. Comparar tiempos, evidencia, responsables, mensajes y puntos de espera.</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Cerrar con una junta de síntesis de 30 min con el dueño o líder operativo para validar hallazgos, priorizar pain points y acordar qué se convertirá en acción del tablero.</span></div>
        <div class="lbl">Script de discovery — usar en cada entrevista</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">1. "Cuéntame el último caso real que atendiste de inicio a fin. ¿Qué pasó primero, luego qué siguió y cómo supiste que terminó?"</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">2. "¿Qué información necesitas para hacer bien tu parte y de quién depende que te llegue completa?"</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">3. "¿Dónde se pierde más tiempo: esperando datos, corrigiendo errores, confirmando estatus, subiendo evidencia o resolviendo excepciones?"</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">4. "Cuando algo falla, ¿cómo te enteras, quién decide qué hacer y cómo queda documentado?"</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">5. "Si pudieras eliminar un paso, automatizar una captura o recibir una alerta antes, ¿qué elegirías y por qué?"</span></div>
        <div class="lbl">Documentar en el tablero</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Crear una acción por cada pain point encontrado, vincularla al gap correspondiente con story points asignados</span></div>
        <div class="dbox"><div class="dlbl">Entregable</div><div class="dtxt">Mapa de pain points por proceso (1 página) + matriz "hallazgo → evidencia → gap → acción" creada en el tablero. Tiempo total sugerido: 1 mañana de entrevistas + 1 hora de síntesis.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#FAEEDA;color:#633806;">Mes 1</span>
        <span class="card-title">Entender el modelo de negocio y la propuesta de valor</span>
        <span class="tag">Estrategia</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Preguntas que debes poder responder al final del mes</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">¿Cómo gana dinero la empresa? ¿Por ruta, por cliente, por tipo de carga? ¿Cuál es el margen promedio por viaje?</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">¿Quiénes son los 3 clientes más importantes? ¿Qué exigen? ¿En qué fallamos con ellos?</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">¿Cuál es el principal diferenciador competitivo hoy vs la competencia? ¿Es precio, confiabilidad, temperatura, rapidez?</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">¿Cuál es el costo de una entrega perfecta vs una con incidencia? (Cuantificar en pesos)</span></div>
        <div class="lbl">Cómo conseguir estas respuestas</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Sesión de 1 hora con el dueño: preguntas abiertas, sin PowerPoint, solo escuchar y tomar notas</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Revisar los últimos 3 meses de acciones en el tablero para identificar patrones de falla recurrentes</span></div>
        <div class="dbox"><div class="dlbl">Entregable</div><div class="dtxt">Business Model Canvas de la empresa completado (Miro, gratis) + mapa de clientes clave con sus exigencias principales.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#FAEEDA;color:#633806;">Mes 2–3</span>
        <span class="card-title">Mapear los procesos tal como ocurren hoy (AS-IS real)</span>
        <span class="tag">BPMN</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Metodología</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Por cada proceso del flujo O2C, hacer una sesión de 30 min con la persona que lo ejecuta — no con el jefe. El jefe describe cómo debería funcionar; el operador describe cómo realmente funciona.</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Preguntar siempre: "¿hay algún paso que haces diferente a lo que está en el manual?" y "¿qué pasa cuando algo falla?"</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Modelar el proceso AS-IS en bpmn.io inmediatamente después de la sesión, mientras los detalles están frescos</span></div>
        <div class="lbl">Procesos a mapear (en orden de impacto)</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">1. Captura de evidencia y PODs (GAP-04) — mayor impacto en score (5.38%)</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">2. Facturación y Carta Porte (GAP-02, GAP-07) — segundo mayor impacto</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">3. Monitoreo y tracking (GAP-03) — tercer mayor impacto</span></div>
        <div class="dbox"><div class="dlbl">Entregable</div><div class="dtxt">3 diagramas BPMN AS-IS validados con los ejecutores reales del proceso — no con el dueño.</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head" onclick="tog(this)">
        <span class="week-badge" style="background:#FAEEDA;color:#633806;">Mes 4–6</span>
        <span class="card-title">Sesiones mensuales de revisión estratégica</span>
        <span class="tag">Facilitación</span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i>
      </div>
      <div class="card-body">
        <div class="lbl">Cadencia recomendada</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Semanal (lunes, 30 min): Sprint planning con el equipo operativo — qué acciones entran al sprint, quién se compromete a qué</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Quincenal (viernes, 45 min): Sprint review con el equipo — qué se completó, qué KPI se movió, qué se aprendió</span></div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Mensual (último viernes, 90 min): sesión estratégica con el dueño — revisión de score global, gaps, FCE y priorización del siguiente mes</span></div>
        <div class="lbl">Regla de oro para cada sesión</div>
        <div class="task"><span class="dot" style="background:#BA7517"></span><span class="ttext">Toda sesión termina con al menos 1 acción creada en el tablero con responsable y fecha asignados. Sin acción en el tablero, la sesión no ocurrió.</span></div>
        <div class="dbox"><div class="dlbl">Entregable</div><div class="dtxt">Cadencia de ceremonias funcionando + acta de cada sesión como acción en el tablero. Al mes 6: el equipo corre las ceremonias sin que tú las convocues.</div></div>
      </div>
    </div>

  </div>

  <div style="margin-top:16px">
    <div class="phase-label">Recomendaciones críticas de consultoría</div>
    <div class="rule-box">
      <div class="rule-title">La regla del 50/50</div>
      <div class="rule-txt">Por cada hora de estudio teórico, una hora de aplicación real al negocio. Si estudias VSM y no produces un VSM de la empresa esa misma semana, el aprendizaje se pierde. El tablero es tu laboratorio — úsalo.</div>
    </div>
    <div class="rule-box">
      <div class="rule-title">El riesgo principal: estudiar sin producir artefactos</div>
      <div class="rule-txt">La tentación de consumir cursos, videos y libros sin generar entregables es alta. Cada mes debe tener un artefacto tangible que el dueño pueda ver, tocar y usar. Si no hay artefacto, no hay aprendizaje.</div>
    </div>
    <div class="rule-box">
      <div class="rule-title">Scrum Master en este contexto no es gestionar sprints de software</div>
      <div class="rule-txt">Es ser el guardián del proceso de mejora continua. Tu backlog son los gaps, tu velocity son los story points completados por sprint, tu definition of done es el KPI en meta. Ya tienes todo modelado — ahora necesitas la cadencia y la disciplina de las ceremonias.</div>
    </div>
    <div class="rule-box">
      <div class="rule-title">El tablero es tu credencial más poderosa</div>
      <div class="rule-txt">Más que cualquier certificación, tener un tablero vivo con datos reales, KPIs que se mueven y gaps que se cierran te posiciona como consultor. Cuando el dueño vea el score global pasar de 13% a 40%, eso vale más que un certificado en la pared.</div>
    </div>
    <div style="margin-top:10px;text-align:center">
      <button onclick="sendPrompt('Quiero generar la instrucción para Cursor para implementar las ceremonias Scrum en el tablero')">Generar instrucción Cursor para ceremonias Scrum ↗</button>
    </div>
  </div>
</div>

</div>

<script>
function show(i){
  ['p0','p1','p2'].forEach((id,j)=>{
    document.getElementById(id).classList.toggle('on',j===i)
  })
  document.querySelectorAll('.tnav').forEach((b,j)=>b.classList.toggle('on',j===i))
}
function tog(head){
  const body=head.nextElementSibling
  const chev=head.querySelector('.chev')
  const op=body.classList.toggle('op')
  if(chev)chev.classList.toggle('op',op)
}
</script>
