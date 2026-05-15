import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { finalizeFailedGatewayInteraction } from '../_shared/gatewayErrors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import { lovableChatCompletion, MAX_CHAT_MESSAGE_CHARS } from '../_shared/lovableGateway.ts'

const SYSTEM_O2C =
  'Eres un asistente experto en procesos Order-to-Cash (O2C). Responde de forma clara, concisa y profesional en español.'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  let body: { message?: string }
  try {
    body = (await req.json()) as { message?: string }
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido' }, 400)
  }

  const message =
    typeof body.message === 'string' ? body.message.trim().slice(0, MAX_CHAT_MESSAGE_CHARS) : ''
  if (!message) {
    return jsonResponse({ error: 'El campo message es obligatorio' }, 400)
  }

  const gatewayRes = await lovableChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_O2C.slice(0, MAX_CHAT_MESSAGE_CHARS) },
      { role: 'user', content: message },
    ],
  })

  if (!gatewayRes.ok) {
    return finalizeFailedGatewayInteraction('ai-chat', gatewayRes)
  }

  const data = (await gatewayRes.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const reply = data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta'

  return jsonResponse({ reply })
})
