import { createClient } from '@supabase/supabase-js'
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
        messages?: Array<WhatsAppMessage>
        statuses?: Array<Record<string, unknown>>
      }
    }>
  }>
}

type WhatsAppMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  interactive?: {
    type?: string
    button_reply?: {
      id?: string
      title?: string
    }
  }
}

type CheckpointRow = {
  id: string
  accion_id: string
}

type AccionRow = {
  id: string
  estado: string
}

function optionalEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? ''
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Falta secreto ${name}`)
  return value
}

function adminClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
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

async function resolveUsuarioId(client: ReturnType<typeof createClient>, waId: string): Promise<string | null> {
  if (!waId) return null
  const { data, error } = await client
    .from('user_channel_identities')
    .select('usuario_id')
    .eq('channel', 'whatsapp')
    .eq('status', 'active')
    .or(`external_user_id.eq.${waId},external_chat_id.eq.${waId}`)
    .maybeSingle<{ usuario_id: string }>()
  if (error) {
    console.error('No se pudo resolver identidad WhatsApp:', error)
    return null
  }
  return data?.usuario_id ?? null
}

async function handleCheckpointReply(
  client: ReturnType<typeof createClient>,
  message: WhatsAppMessage
): Promise<void> {
  const buttonId = message.interactive?.button_reply?.id ?? ''
  const match = /^chk:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(done|progress|support)$/i.exec(buttonId)
  if (!match) return

  const [, checkpointId, response] = match
  const usuarioId = await resolveUsuarioId(client, message.from ?? '')

  const { data: checkpoint, error: checkpointError } = await client
    .from('accion_checkpoints')
    .select('id,accion_id')
    .eq('id', checkpointId)
    .eq('activo', true)
    .maybeSingle<CheckpointRow>()
  if (checkpointError || !checkpoint) {
    console.error('Checkpoint WhatsApp no encontrado:', checkpointError ?? checkpointId)
    return
  }

  const { data: accion, error: accionError } = await client
    .from('acciones_diarias')
    .select('id,estado')
    .eq('id', checkpoint.accion_id)
    .maybeSingle<AccionRow>()
  if (accionError || !accion) {
    console.error('Accion WhatsApp no encontrada:', accionError ?? checkpoint.accion_id)
    return
  }

  if (response === 'done') {
    const { error: updateCheckpointError } = await client
      .from('accion_checkpoints')
      .update({
        completado: true,
        checked_at: new Date().toISOString(),
        checked_by: usuarioId,
      })
      .eq('id', checkpoint.id)
    if (updateCheckpointError) console.error('No se pudo marcar checkpoint por WhatsApp:', updateCheckpointError)
  }

  const nextEstado =
    response === 'support'
      ? 'Bloqueado'
      : response === 'progress' && accion.estado === 'Bloqueado'
        ? 'Bloqueado'
        : 'En_Ejecucion'

  if (accion.estado !== nextEstado) {
    const { error: updateAccionError } = await client
      .from('acciones_diarias')
      .update({ estado: nextEstado })
      .eq('id', accion.id)
    if (updateAccionError) console.error('No se pudo actualizar estado por WhatsApp:', updateAccionError)
  }

  await client.from('external_inbound_messages').insert({
    channel: 'whatsapp',
    external_update_id: message.id ?? `${checkpoint.id}:${response}:${Date.now()}`,
    external_chat_id: message.from ?? null,
    external_user_id: message.from ?? null,
    usuario_id: usuarioId,
    accion_id: accion.id,
    checkpoint_id: checkpoint.id,
    message_type: 'interactive_button_reply',
    processed_at: new Date().toISOString(),
    payload: {
      kind: 'checkpoint_reply',
      checkpoint_id: checkpoint.id,
      accion_id: accion.id,
      response,
      next_estado: nextEstado,
    },
  }).then(({ error }) => {
    if (error) console.error('No se pudo guardar inbound WhatsApp:', error)
  })
}

async function handleWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
  const client = adminClient()
  const messages = (payload.entry ?? [])
    .flatMap((entry) => entry.changes ?? [])
    .flatMap((change) => change.value?.messages ?? [])
  await Promise.all(messages.map((message) => handleCheckpointReply(client, message)))
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
  await handleWebhookPayload(payload)
  return jsonResponse({ ok: true })
})
