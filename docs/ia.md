Guía de Uso y Configuración de la IA de Apoyo — Transformación O2C
Versión: 1.0
Fecha: Mayo 2026
Proyecto: Transformación Order-to-Cash (O2C)
Propósito: Documentar la integración, configuración y uso de la inteligencia artificial como herramienta de apoyo dentro del ecosistema del proyecto.

1. Visión General
La IA de Apoyo asiste al equipo mediante modelos disponibles detrás del backend (gateway Lovable en Lovable Cloud, o tu propio proveedor compatible cuando el proyecto usa Supabase externo sin Lovable Cloud). Su propósito es asistir en:

Análisis predictivo de riesgos y tendencias en el pipeline O2C.
Generación de insights a partir de datos de KPIs y avance de Gaps.
Automatización de reportes y narrativas de status.
Asistencia conversacional para consultas técnicas y operativas del proyecto.
2. Arquitectura de la Integración
2.1 Flujo de Datos
┌─────────────┐      ┌──────────────────┐      ┌───────────────────┐
│   Cliente   │─────▶│  Edge Function   │─────▶│   Proveedor IA    │
│ (React App) │◀─────│ (Supabase/Edge) │◀─────│ (Lovable u otro)  │
└─────────────┘      └──────────────────┘      └───────────────────┘
El usuario interactúa con la aplicación (chat, análisis, generador de reportes).
La aplicación envía una solicitud HTTP a una Edge Function.
La Edge Function invoca `resolveChatBackend()` (ver código en `_shared/lovableGateway.ts`): si existe `LOVABLE_API_KEY` (inyectado en Lovable Cloud), usa `https://ai.gateway.lovable.dev/v1/chat/completions`; si no y existe `OPENAI_API_KEY`, usa un endpoint compatible OpenAI configurado por secretos.
La respuesta (también en streaming SSE) regresa al cliente y se muestra en la UI.
2.2 Ventajas de esta Arquitectura
Seguridad: Ninguna clave del proveedor (p. ej. `LOVABLE_API_KEY`, `OPENAI_API_KEY`) se expone al cliente; reside solo en el entorno Edge.
Escalabilidad: Edge Functions serverless escalan por demanda.
Flexibilidad: Puedes ajustar modelos mediante variables de entorno sin tocar el código del cliente.
Cumplimiento: El tratamiento sensible ocurre en el backend.

2.3 Variables de entorno (separación estricta)
Las variables del **frontend** (`VITE_*`, build de Vite) **no** se configuran como secretos de Supabase Edge. Los **secrets** de Edge Functions (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` si aplica, `OPENAI_*`, `GOOGLE_MAPS_API_KEY`, etc.) **no** llevan prefijo `VITE_` y **no** existen en `import.meta.env`. Tabla y CLI: [environment-variables.md](./environment-variables.md).

3. Configuración del Entorno
3.1 Tres escenarios de despliegue
**(A) Proyecto en Lovable Cloud** — El secreto `LOVABLE_API_KEY` es **gestionado e inyectado por Lovable** en las Edge Functions. **No ejecutes** `npx supabase secrets set LOVABLE_API_KEY=...` esperando obtener o “pegar” la clave de Lovable (no es un valor visible ni exportable como una API key típica de terceros). En el código, usa `Deno.env.get("LOVABLE_API_KEY")` como en este repositorio; asume que Lovable provee la variable cuando el despliegue es el correcto. Opcional: `LOVABLE_AI_MODEL` o `CHAT_DEFAULT_MODEL`.

**(B) Supabase externo (sin Lovable Cloud)** — `LOVABLE_API_KEY` **no está disponible**. Configura como secretos los de tu proveedor compatible con chat completions tipo OpenAI, por ejemplo: `OPENAI_API_KEY`; opcional `OPENAI_API_BASE_URL`, `OPENAI_MODEL`, `CHAT_DEFAULT_MODEL` (véase `_shared/lovableGateway.ts`).

**(C) App externa consumiendo IA** — **No** otorgues ni expongas `LOVABLE_API_KEY`. Expón una Edge Function puente dentro del proyecto Lovable/Supabase; la app externa llama esa función autenticada. El secreto de Lovable sigue únicamente en el servidor del proyecto hospedado allí.

3.2 Requisitos básicos
Proyecto con Edge Functions definidas según este repo (`supabase/config.toml`).
Credenciales del escenario correspondiente según la sección 3.1.

3.3 Verificación opcional en Lovable Cloud
Si utilizas herramientas de Lovable, puedes revisar los secretos gestionados, p. ej.:

```bash
npx lovable secrets list
```

Puede aparecer `LOVABLE_API_KEY` como nombre de secreto sin que el valor sea legible como texto copiable para `.env`.

3.4 Estructura de archivos (este repositorio)
supabase/
├── functions/
│   ├── _shared/              # cors, usuario, errores upstream, `lovableGateway.ts` (resolve backend)
│   ├── lovable-chat-completions/   # Proxy genérico mensajes/stream
│   ├── ai-chat/              # Chatbot de apoyo al equipo (no streaming)
│   ├── ai-chat-stream/       # Chat con SSE
│   ├── ai-insights/          # Generación de insights de KPIs
│   └── ai-report/            # Generación de reportes narrativos
└── config.toml
4. Implementación de Edge Functions de IA en este proyecto
La implementación de referencia está en `supabase/functions/` y usa `lovableChatCompletion()` desde `_shared/lovableGateway.ts`, que encapsula URL, modelo por defecto y cabecera `Authorization` según `resolveChatBackend()` (Lovable si hay `LOVABLE_API_KEY`, u OpenAI-compatible si hay `OPENAI_API_KEY`).
4.1 Patrón recomendado (extracción)
Tras validar JWT y el cuerpo JSON, construye el payload de chat y delega:

```typescript
const gatewayRes = await lovableChatCompletion({
  messages: [/* system, user, … */],
  stream: false, // true para SSE donde aplique
})
if (!gatewayRes.ok) return finalizeFailedGatewayInteraction('mi-funcion', gatewayRes)
// JSON: await gatewayRes.json() / streaming: devolver gatewayRes.body con text/event-stream
```

Para el manejo de CORS y de usuario ver `ai-chat/index.ts`; para streaming estable, `ai-chat-stream/index.ts`. Guía técnica y escenarios Lovable vs Supabase externo: [lovable-ai-edge-function.md](./lovable-ai-edge-function.md).
5. Consumo desde el Frontend (React)
5.1 Cabeceras y URL
La implementación real está en `src/features/ai-support/services/aiFunctionsClient.ts`: se obtiene el **JWT de la sesión** con `supabase.auth.getSession()`, se envía `Authorization: Bearer <access_token>` y, si existe, `apikey: VITE_SUPABASE_ANON_KEY`. La base URL es `VITE_SUPABASE_URL` + `/functions/v1/...`. Las claves de IA **nunca** están en el cliente; solo `VITE_*` de Supabase público + token de usuario.

Ejemplo esquemático (el proyecto usa los servicios ya importados en `AiAssistPage` y tablas asociadas; no uses la anon key como `Authorization` Bearer):

```typescript
import { getAiInvocationHeaders, getAiFunctionsBaseUrl } from '@/features/ai-support/services/aiFunctionsClient'

const url = `${getAiFunctionsBaseUrl()}/ai-chat-stream`
const res = await fetch(url, {
  method: 'POST',
  headers: await getAiInvocationHeaders(),
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Hola' }] }),
})
```

Detalle de variables: [environment-variables.md](./environment-variables.md).

5.2 Pestañas en la app
La ruta del asistente es `/asistente-ia` (véase `ROUTES.AI_ASSIST`); chat con stream, KPI insights y reporte de sprint consumen distintas funciones bajo el mismo patrón de cabeceras.
6. Catálogo de Modelos Disponibles
Modelo	Proveedor	Uso Recomendado	Costo / Velocidad
google/gemini-3-flash-preview	Google (default)	Tareas generales, chat, clasificación, resumen	Rápido, económico
google/gemini-2.5-pro	Google	Razonamiento complejo, análisis multimodal (imagen + texto), contexto largo	Lento, más costoso
google/gemini-2.5-flash	Google	Balance razonamiento / velocidad	Medio
openai/gpt-5	OpenAI	Alta precisión, razonamiento profundo, tareas exigentes	Más lento, costoso
openai/gpt-5-mini	OpenAI	Buen rendimiento a menor costo que GPT-5	Medio
openai/gpt-5-nano	OpenAI	Tareas simples de alto volumen	Muy rápido, muy económico
openai/gpt-5.2	OpenAI	Razonamiento avanzado, resolución de problemas complejos	Medio-alto
Regla general: Usa google/gemini-3-flash-preview como default. Cambia a gpt-5 o gemini-2.5-pro solo si la tarea requiere razonamiento profundo o precisión máxima.

7. Prompts Especializados para el Proyecto O2C
7.1 Análisis de Riesgo de un Gap
Sistema: Eres un analista de transformación O2C. Evalúa el riesgo de ejecución del gap {gap_name} considerando: dependencias críticas, recursos asignados, complejidad técnica y plazo. Devuelve un análisis en formato JSON con: nivel_riesgo (bajo/medio/alto), factores_clave (lista), mitigaciones_sugeridas (lista).
7.2 Generación de Narrativa de Sprint
Sistema: Eres un Scrum Master experto en O2C. Genera un resumen ejecutivo del sprint basado en estos datos de avance: {sprint_data}. Incluye logros, impedimentos, y recomendaciones para el siguiente sprint. Máximo 200 palabras, tono profesional.
7.3 Asistente de KPIs
Sistema: Eres un experto en métricas de procesos Order-to-Cash. El usuario te consultará sobre KPIs, sus fórmulas, baselines y cómo mejorarlos. Responde siempre con datos concretos del proyecto cuando sea posible.
8. Manejo de Errores y Límites
8.1 Códigos de Estado Comunes
Código	Significado	Acción Recomendada
429	Rate limit excedido	Implementar backoff exponencial; mostrar "Demasiadas solicitudes, espera un momento"
402	Créditos agotados	Notificar al administrador; ofrecer guardar la consulta para más tarde
500	Error interno del gateway	Reintentar 1 vez; si persiste, registrar error y mostrar mensaje genérico
503	Gateway no disponible	Reintentar con delay progresivo (1s, 2s, 4s)
8.2 Patrón de Reintentos (Frontend)
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, options);
      if (resp.status === 429 || resp.status === 503) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      return resp;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
  throw new Error("Max retries exceeded");
}
9. Buenas Prácticas
Nunca expongas claves del proveedor de IA (`LOVABLE_API_KEY`, `OPENAI_API_KEY`, etc.) en el cliente; usa Edge Functions como único punto de llamada autenticado.
Define system prompts claros. Guían el comportamiento del modelo y mejoran la calidad de respuestas.
Usa streaming para chat. Mejora la percepción de velocidad y experiencia de usuario.
Limita el historial de conversación. Enviar todo el historial en cada request aumenta tokens y costo. Considera resumir o truncar.
Implementa rate limiting en el cliente. Evita que un usuario envíe 50 mensajes en 10 segundos.
Registra métricas. Lleva traza de: latencia promedio, errores por tipo, tokens consumidos (si el gateway lo expone).
Haz fallback a contenido estático. Si la IA falla, muestra contenido pre-generado o un mensaje útil en lugar de un error crudo.
10. Casos de Uso Recomendados para el Proyecto O2C
Caso de Uso	Modelo Sugerido	Tipo de Llamada	Componente UI
Chat de ayuda técnica	gemini-3-flash-preview	Streaming	Panel flotante o sidebar
Generador de reportes de sprint	gemini-2.5-pro o gpt-5	Directa	Botón "Generar reporte" en Dashboard
Análisis de riesgo de Gap	gpt-5	Directa (JSON)	Modal con resultado estructurado
Sugerencias de priorización	gemini-3-flash-preview	Directa (JSON)	Tabla con rankings sugeridos
Explicación de KPIs	gemini-3-flash-preview	Streaming	Tooltip interactivo o panel de ayuda
11. Glosario de Términos
Término	Definición
Edge Function	Función serverless que corre en el backend, ideal para lógica segura y llamadas a APIs externas.
SSE (Server-Sent Events)	Protocolo de streaming donde el servidor envía datos al cliente a través de una conexión HTTP persistente.
System Prompt	Instrucción inicial que define el rol y comportamiento del modelo de IA.
Token	Unidad mínima de procesamiento en modelos de lenguaje; aproximadamente 0.75 palabras en español.
Rate Limit	Límite de solicitudes por minuto impuesto por el gateway para prevenir abuso.
Gateway	Punto de entrada centralizado que enruta las solicitudes de IA al modelo apropiado.
12. Referencias y Recursos
Lovable AI Gateway: https://ai.gateway.lovable.dev/v1/chat/completions
Documentación Oficial: Consulta la sección "AI" en la documentación de Lovable.
Documentos del Proyecto:
Implementación Edge Functions según escenarios: [lovable-ai-edge-function.md](./lovable-ai-edge-function.md).
Variables por entorno (frontend vs secrets): [environment-variables.md](./environment-variables.md).
KPIs_Estructura_Completa_O2C.md — Arquitectura de KPIs y Gaps.
Matriz_Impacto_UserStories_O2C.md — Relación matemática entre historias y score global.
Academia_O2C_Especificacion_Completa.md — Módulos de capacitación y quizzes.
Nota final: Esta guía es un documento vivo. A medida que se desplieguen nuevos modelos o cambien las capacidades del gateway, actualiza la sección de catálogo de modelos y ejemplos de código.