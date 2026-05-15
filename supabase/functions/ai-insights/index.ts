import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { finalizeFailedGatewayInteraction } from '../_shared/gatewayErrors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import { lovableChatCompletion, MAX_CHAT_MESSAGE_CHARS } from '../_shared/lovableGateway.ts'

type InsightMode = 'gap_risk' | 'kpi_assist'

function buildSystemPrompt(mode: InsightMode, gap_name?: string): string {
  if (mode === 'gap_risk') {
    const name = gap_name?.trim() || '(gap sin nombre)'
    return (
      `Eres un analista de transformación O2C. Evalúa el riesgo de ejecución del gap "${name}" ` +
      'considerando: dependencias críticas, recursos asignados, complejidad técnica y plazo. ' +
      'Devuelve un análisis en formato JSON válido con exactamente estas claves: ' +
      '"nivel_riesgo" (string: bajo|medio|alto), "factores_clave" (array de strings), ' +
      '"mitigaciones_sugeridas" (array de strings). Sin markdown ni texto fuera del JSON.'
    )
  }
  return (
    'Eres un experto en métricas de procesos Order-to-Cash (O2C). ' +
    'El usuario consultará sobre KPIs, fórmulas, baselines y mejoras. ' +
    'Responde con información concreta y, cuando el usuario aporte contexto del proyecto, úsalo. ' +
    'Responde en texto plano o listas claras en español (no hace falta JSON salvo que el usuario lo pida).'
  )
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  let body: {
    mode?: string
    gap_name?: string
    user_message?: string
    context?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido' }, 400)
  }

  const mode = body.mode === 'kpi_assist' ? 'kpi_assist' : 'gap_risk'
  const userPart = [body.user_message, body.context]
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .join('\n\n')
    .trim()

  if (!userPart && mode === 'kpi_assist') {
    return jsonResponse({ error: 'Indica user_message o context para la consulta de KPIs' }, 400)
  }

  const system = buildSystemPrompt(mode, body.gap_name).slice(0, MAX_CHAT_MESSAGE_CHARS)
  const rawUser =
    userPart ||
    (mode === 'gap_risk'
      ? 'Analiza el riesgo con la información disponible y supuestos razonables si faltan datos.'
      : '')
  const userContent = rawUser.slice(0, MAX_CHAT_MESSAGE_CHARS)

  const gatewayRes = await lovableChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  })

  if (!gatewayRes.ok) {
    return finalizeFailedGatewayInteraction('ai-insights', gatewayRes)
  }

  const data = (await gatewayRes.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const reply = data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta'

  if (mode === 'gap_risk') {
    try {
      const parsed = JSON.parse(reply) as Record<string, unknown>
      return jsonResponse({ reply: parsed })
    } catch {
      return jsonResponse({ reply, parseWarning: 'La respuesta no era JSON válido; se devuelve como texto' })
    }
  }

  return jsonResponse({ reply })
})
