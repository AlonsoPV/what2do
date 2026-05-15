import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { finalizeFailedGatewayInteraction } from '../_shared/gatewayErrors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import { lovableChatCompletion, MAX_CHAT_MESSAGE_CHARS } from '../_shared/lovableGateway.ts'

const SYSTEM_SPRINT =
  'Eres un Scrum Master experto en O2C. Genera un resumen ejecutivo del sprint basado en los datos que te proporcionen. ' +
  'Incluye logros, impedimentos y recomendaciones para el siguiente sprint. Máximo 200 palabras, tono profesional, en español.'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  let body: { sprint_data?: string }
  try {
    body = (await req.json()) as { sprint_data?: string }
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido' }, 400)
  }

  const sprint_data = typeof body.sprint_data === 'string' ? body.sprint_data.trim() : ''
  if (!sprint_data) {
    return jsonResponse({ error: 'El campo sprint_data es obligatorio' }, 400)
  }

  const userMsg = sprint_data.slice(0, MAX_CHAT_MESSAGE_CHARS)

  const gatewayRes = await lovableChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_SPRINT.slice(0, MAX_CHAT_MESSAGE_CHARS) },
      { role: 'user', content: userMsg },
    ],
  })

  if (!gatewayRes.ok) {
    return finalizeFailedGatewayInteraction('ai-report', gatewayRes)
  }

  const data = (await gatewayRes.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const reply = data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta'

  return jsonResponse({ reply })
})
