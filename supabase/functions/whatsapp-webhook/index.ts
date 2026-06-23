import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

declare global {
  var Deno: {
    env: { get(key: string): string | undefined }
    serve: (handler: (req: Request) => Response | Promise<Response>) => void
  }
}

type WhatsAppWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        messaging_product?: string
        metadata?: {
          display_phone_number?: string
          phone_number_id?: string
        }
        contacts?: Array<{
          wa_id?: string
          profile?: { name?: string }
        }>
        messages?: Array<Record<string, unknown>>
        statuses?: Array<Record<string, unknown>>
      }
    }>
  }>
}

function optionalEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? ''
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

function verifyWebhook(req: Request): Response {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const expectedToken = optionalEnv('WHATSAPP_VERIFY_TOKEN')

  if (mode === 'subscribe' && token && challenge && expectedToken && token === expectedToken) {
    return textResponse(challenge)
  }

  console.warn('Verificacion de webhook WhatsApp rechazada', {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
    hasExpectedToken: Boolean(expectedToken),
  })
  return textResponse('Forbidden', 403)
}

function summarizePayload(payload: WhatsAppWebhookPayload) {
  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).map((change) => ({
      entry_id: entry.id,
      field: change.field,
      phone_number_id: change.value?.metadata?.phone_number_id,
      messages: change.value?.messages?.length ?? 0,
      statuses: change.value?.statuses?.length ?? 0,
      contacts: change.value?.contacts?.length ?? 0,
    }))
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return verifyWebhook(req)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Metodo no permitido' }, 405)
  }

  const payload = await req.json().catch(() => null) as WhatsAppWebhookPayload | null
  if (!payload) {
    return jsonResponse({ ok: false, message: 'Payload invalido' }, 400)
  }

  console.log('Webhook WhatsApp recibido', summarizePayload(payload))
  return jsonResponse({ ok: true })
})
