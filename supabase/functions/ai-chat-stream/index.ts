import { corsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { finalizeFailedGatewayInteraction } from '../_shared/gatewayErrors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import { getLovableModel, lovableChatCompletion, normalizeMessages } from '../_shared/lovableGateway.ts'

const SYSTEM_STREAM =
  'Asistente experto en procesos Order-to-Cash (O2C). Responde en español, de forma clara y profesional.'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  let body: { messages?: unknown }
  try {
    body = (await req.json()) as { messages?: unknown }
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido' }, 400)
  }

  const userMessages = normalizeMessages(body.messages)
  if (userMessages.length === 0) {
    return jsonResponse({ error: 'messages debe ser un arreglo no vacío de {role, content}' }, 400)
  }

  const gatewayRes = await lovableChatCompletion({
    messages: [{ role: 'system', content: SYSTEM_STREAM }, ...userMessages],
    stream: true,
    model: getLovableModel(),
  })

  if (!gatewayRes.ok) {
    return finalizeFailedGatewayInteraction('ai-chat-stream', gatewayRes)
  }

  return new Response(gatewayRes.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
