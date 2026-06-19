# Auditoria de lentitud de carga - 2026-06-10

## Causas principales detectadas

- El header ejecutaba el calculo de gamificacion de disciplina en todas las pantallas. Ese calculo carga acciones de 90 dias y comentarios vinculados aunque el usuario no este en Disciplina.
- Notificaciones mantenia canales Realtime sin removerlos al desmontar. Al navegar o remontar componentes podia acumular suscripciones.
- El badge de notificaciones hacia polling cada 45 segundos incluso cuando no estaba abierto el centro de notificaciones.
- Dashboard y Kanban precargaban el catalogo `evidencia_esperada` al montar, aun cuando el usuario no abria el modal de accion.
- Catalogos como roles, prioridades, estatus y dropdown options tenian cache corta o refetch agresivo.
- La busqueda de acciones filtraba en frontend despues de traer datos desde Supabase.
- Faltaban indices compuestos para rutas frecuentes: acciones por fecha/responsable/estado, busqueda textual, comentarios por accion y notificaciones por usuario/leido/fecha.

## Modulos mas impactados

- Header/AppLayout: impacto global porque esta presente en todas las rutas autenticadas.
- Notificaciones: polling y Realtime podian afectar navegacion general.
- Dashboard y Kanban: cargaban datos no criticos durante el montaje inicial.
- Acciones/Calendario/Disciplina: dependen de consultas amplias sobre `acciones_diarias` y `accion_comentarios`.
- Catalogos: refetches repetidos al montar formularios y filtros.

## Roles y permisos

El flujo principal ya usa `AuthContext` como fuente de verdad para sesion/perfil y `useCurrentUser` evita repetir la query cuando el perfil autenticado esta disponible. No se encontro una carga remota separada de permisos por modulo; las validaciones son funciones locales por rol. El impacto venia mas de datos globales cargados desde layout/header que de permisos.

## Queries duplicadas o lentas

- Score de disciplina desde Header duplicaba parte de la carga de Disciplina.
- Notificaciones podia tener suscripciones duplicadas por falta de cleanup.
- Catalogos repetian refetch al montar.
- Busqueda de acciones traia registros y filtraba localmente.
- Notificaciones y comentarios tenian patrones que se benefician de indices compuestos.

## Cambios aplicados

- Ajuste de defaults de React Query: `staleTime` 2 min, `gcTime` 15 min, `retry` 1, `refetchOnWindowFocus` desactivado.
- Score de disciplina del Header se carga solo al abrir el menu de perfil.
- Realtime de notificaciones ahora remueve el canal con `supabase.removeChannel`.
- El badge de notificaciones ya no hace polling permanente por defecto; el centro abierto conserva actualizacion viva.
- Dashboard y Kanban dejaron de precargar `evidencia_esperada` al montar; ahora se prefetchea al abrir/seleccionar accion.
- Catalogos de roles, prioridades, estatus y dropdowns usan cache de 10 min e invalidan solo queries activas.
- Busqueda de acciones se movio a Supabase con `ilike` en `titulo_accion`, `descripcion_accion` y `evidencia_esperada`.
- Se agrego y aplico en Supabase PROD la migracion `20260610120100_performance_indexes_for_loading_paths.sql`.
- Se agrego la RPC `calendar_action_counts_by_day` para conteos por dia visible del calendario.
- Calendario dejo de expandir todas las acciones por dia visible en frontend; usa conteos server-side para la grilla y solo carga detalle cuando hay dia seleccionado.
- Se agrego `manualChunks` para separar React, Supabase, TanStack Query, Radix, dnd-kit e iconos.
- Se redujeron `select('*')`/`select()` implicitos en los servicios criticos de acciones, comentarios, checkpoints, calendario, recordatorios, notificaciones y tickets de soporte.
- La busqueda de tickets de soporte tambien se movio a Supabase con filtros `ilike`.

## Pruebas realizadas

- `npm run build`: exitoso. Sin warning de chunk grande de Vite; chunk mayor: `vendor-react` ~296 kB minificado.
- `npx eslint` focal sobre archivos modificados: exitoso.
- `npm run lint`: falla por deuda preexistente fuera del cambio (`scratch/`, scripts Node, hooks/paginas existentes y funciones Supabase). No aparecieron errores en los archivos tocados.
- Migracion remota aplicada en proyecto Supabase `xhpasmjzuwifmjhrsumb` (`Scrumban PROD`).
- Verificacion remota: indices creados y RPC existente.
- `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` sobre `calendar_action_counts_by_day`: ejecucion ~91 ms en ventana de prueba de 46 dias.
- Advisor de seguridad: la RPC nueva ya no aparece con `function_search_path_mutable`; quedan hallazgos preexistentes fuera de este cambio.

## Resultados observados

- Build de produccion compila correctamente.
- Se reducen cargas globales durante navegacion autenticada.
- Se evitan canales Realtime acumulados.
- Se reducen refetches de catalogos y polling de notificaciones.
- La busqueda de acciones pasa de filtro local a filtro en base de datos.
- El bundle base bajo de ~800 kB minificado a ~201 kB minificado; dependencias pesadas quedaron en chunks dedicados.
- La grilla de Calendario ahora recibe un mapa `{fecha: conteo}` desde Supabase en vez de derivarlo expandiendo acciones en memoria.

## Riesgos y pendientes

- No se hicieron pruebas reales con usuarios admin/operativo/lider porque no se ejecutaron credenciales ni navegacion autenticada real.
- Aun existen `select('*')` en servicios no criticos o de otros modulos (`usuarios`, `sprints`, KPI/catalogos, distance, academy). Recomendable tratarlos por pantalla para evitar cambios de contrato amplios.
- Supabase Performance Advisor sigue reportando deuda preexistente de llaves foraneas sin indice y politicas multiples/permisivas en tablas fuera del alcance directo de carga inicial.
- Supabase Security Advisor sigue reportando funciones preexistentes sin `search_path` y funciones `SECURITY DEFINER` ejecutables por `anon`/`authenticated`; no se tocaron porque requieren revision de permisos por flujo.

## Recomendaciones fase 2

- Medir con DevTools/Performance y React Query Devtools en sesion real: initial load, requests por pantalla y navegacion Dashboard -> Kanban -> Disciplina -> Calendario.
- Si el volumen crece mas, crear RPCs de resumen para Dashboard y Disciplina con contratos pequenos por widget.
- Atacar deuda restante de `select('*')` por modulo, empezando por pantallas con mayor trafico real.
- Revisar con cuidado los hallazgos de advisors restantes antes de cambios masivos de RLS o permisos de funciones.
