/**
 * Proxy genérico de chat completions (gateway Lovable o API compatible OpenAI según `_shared/lovableGateway.ts`).
 * - Claves solo en servidor vía env; nunca en cliente; no escribir claves en logs ni en respuestas.
 * - POST JSON: { messages: [...], stream?: boolean, model?: string (opcional) }
 * - Autenticación: JWT de usuario de Supabase (mismo patrón que el resto de funciones IA).
 */

import { corsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { finalizeFailedGatewayInteraction } from '../_shared/gatewayErrors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import {
  getLovableModel,
  lovableChatCompletion,
  normalizeAndClampMessages,
} from '../_shared/lovableGateway.ts'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  let body: { messages?: unknown; stream?: unknown; model?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido' }, 400)
  }

  const messages = normalizeAndClampMessages(body.messages)
  if (!messages) {
    return jsonResponse(
      {
        error:
          'messages inválido: se requiere un arreglo de 1–64 entradas con role user|assistant|system y content no vacío.',
      },
      400
    )
  }

  const stream = body.stream === true
  const modelOverride =
    typeof body.model === 'string' && body.model.trim().length > 0 ? body.model.trim() : getLovableModel()

  const gatewayRes = await lovableChatCompletion({
    messages,
    stream,
    model: modelOverride,
  })

  if (!gatewayRes.ok) {
    return finalizeFailedGatewayInteraction('lovable-chat-completions', gatewayRes)
  }

  if (stream) {
    return new Response(gatewayRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  const data = (await gatewayRes.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const reply = data.choices?.[0]?.message?.content?.trim() || 'Sin respuesta'
  return jsonResponse({ reply })
})
