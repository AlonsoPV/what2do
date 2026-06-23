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
  text?: { body?: string }
  image?: WhatsAppMedia
  document?: WhatsAppMedia & { filename?: string }
  interactive?: {
    type?: string
    button_reply?: {
      id?: string
      title?: string
    }
  }
}

type WhatsAppMedia = {
  id?: string
  mime_type?: string
  caption?: string
}

type CheckpointRow = {
  id: string
  accion_id: string
  texto?: string
}

type AccionRow = {
  id: string
  estado: string
}

type ResultRequest = {
  id: string
  accion_id: string
  checkpoint_id: string | null
  usuario_id: string | null
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

async function whatsAppApi(body: Record<string, unknown>): Promise<void> {
  const graphVersion = optionalEnv('WHATSAPP_GRAPH_VERSION') || 'v20.0'
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('WHATSAPP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      ...body,
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    console.error('WhatsApp API rechazo mensaje desde webhook:', data)
  }
}

async function sendResultPrompt(to: string, checkpointText: string): Promise<void> {
  await whatsAppApi({
    to,
    type: 'text',
    text: {
      preview_url: false,
      body: [
        'Ingresa una descripcion de tu resultado.',
        '',
        `Actividad: ${checkpointText}`,
        '',
        'Puedes responder con texto, foto, imagen, PDF o Excel. Se registrara como comentario en la accion.',
      ].join('\n'),
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

function extensionFromMime(mimeType: string | undefined, fallback = 'bin'): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
  }
  return mimeType ? map[mimeType] ?? fallback : fallback
}

function mediaFromMessage(message: WhatsAppMessage): WhatsAppMedia | null {
  if (message.type === 'image' && message.image?.id) return message.image
  if (message.type === 'document' && message.document?.id) return message.document
  return null
}

function textFromMessage(message: WhatsAppMessage): string {
  if (message.type === 'text') return message.text?.body?.trim() ?? ''
  const media = mediaFromMessage(message)
  return media?.caption?.trim() ?? ''
}

function fileNameFromMessage(message: WhatsAppMessage, mimeType: string | undefined): string {
  if (message.type === 'document' && message.document?.filename) return message.document.filename
  return `whatsapp-${message.id ?? crypto.randomUUID()}.${extensionFromMime(mimeType)}`
}

async function downloadWhatsAppMedia(mediaId: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const graphVersion = optionalEnv('WHATSAPP_GRAPH_VERSION') || 'v20.0'
  const token = env('WHATSAPP_ACCESS_TOKEN')
  const metaResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta = await metaResponse.json().catch(() => ({})) as { url?: string; mime_type?: string }
  if (!metaResponse.ok || !meta.url) throw new Error('No se pudo obtener URL de media WhatsApp')

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!fileResponse.ok) throw new Error('No se pudo descargar media WhatsApp')
  return {
    bytes: new Uint8Array(await fileResponse.arrayBuffer()),
    mimeType: meta.mime_type || fileResponse.headers.get('content-type') || 'application/octet-stream',
  }
}

async function uploadCommentAttachment(
  client: ReturnType<typeof createClient>,
  accionId: string,
  message: WhatsAppMessage
): Promise<{ storage_path: string; file_name: string } | null> {
  const media = mediaFromMessage(message)
  if (!media?.id) return null
  const { bytes, mimeType } = await downloadWhatsAppMedia(media.id)
  const fileName = fileNameFromMessage(message, mimeType)
  const ext = fileName.split('.').pop() || extensionFromMime(mimeType)
  const path = `comentarios/${accionId}/whatsapp-${crypto.randomUUID()}.${ext}`
  const { error } = await client.storage.from('evidencias').upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  })
  if (error) throw error
  return { storage_path: path, file_name: fileName }
}

async function findActiveResultRequest(
  client: ReturnType<typeof createClient>,
  waId: string
): Promise<ResultRequest | null> {
  if (!waId) return null
  const { data, error } = await client
    .from('whatsapp_result_requests')
    .select('id,accion_id,checkpoint_id,usuario_id')
    .eq('wa_id', waId)
    .in('status', ['waiting', 'received'])
    .gt('expires_at', new Date().toISOString())
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle<ResultRequest>()
  if (error) {
    console.error('No se pudo buscar solicitud de resultado WhatsApp:', error)
    return null
  }
  return data ?? null
}

async function handleResultMessage(
  client: ReturnType<typeof createClient>,
  message: WhatsAppMessage
): Promise<boolean> {
  if (message.type === 'interactive') return false
  const request = await findActiveResultRequest(client, message.from ?? '')
  if (!request) return false

  const text = textFromMessage(message)
  const attachment = await uploadCommentAttachment(client, request.accion_id, message).catch((error) => {
    console.error('No se pudo subir adjunto WhatsApp:', error)
    return null
  })
  if (!text && !attachment) return false

  const contenido = text || 'Resultado recibido por WhatsApp.'
  const { error: commentError } = await client.from('accion_comentarios').insert({
    accion_id: request.accion_id,
    contenido,
    created_by: request.usuario_id,
    adjuntos: attachment ? [attachment] : [],
  })
  if (commentError) {
    console.error('No se pudo crear comentario WhatsApp:', commentError)
    return false
  }

  await client
    .from('whatsapp_result_requests')
    .update({
      status: 'received',
      last_received_at: new Date().toISOString(),
      metadata: {
        last_message_id: message.id ?? null,
        last_message_type: message.type ?? null,
      },
    })
    .eq('id', request.id)

  await client.from('external_inbound_messages').insert({
    channel: 'whatsapp',
    external_update_id: message.id ?? `${request.id}:${Date.now()}`,
    external_chat_id: message.from ?? null,
    external_user_id: message.from ?? null,
    usuario_id: request.usuario_id,
    accion_id: request.accion_id,
    checkpoint_id: request.checkpoint_id,
    message_type: message.type ?? 'result_message',
    processed_at: new Date().toISOString(),
    payload: {
      kind: 'result_comment',
      result_request_id: request.id,
      has_attachment: Boolean(attachment),
    },
  }).then(({ error }) => {
    if (error) console.error('No se pudo guardar inbound resultado WhatsApp:', error)
  })

  return true
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
  console.log('Respuesta interactiva WhatsApp recibida', {
    from: message.from,
    buttonId,
    checkpointId,
    response,
    usuarioId,
  })

  const { data: checkpoint, error: checkpointError } = await client
    .from('accion_checkpoints')
    .select('id,accion_id,texto')
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
    const { error: resultRequestError } = await client.from('whatsapp_result_requests').insert({
      accion_id: checkpoint.accion_id,
      checkpoint_id: checkpoint.id,
      usuario_id: usuarioId,
      wa_id: message.from ?? '',
      status: 'waiting',
      metadata: {
        source_message_id: message.id ?? null,
        checkpoint_text: checkpoint.texto ?? null,
      },
    })
    if (resultRequestError) console.error('No se pudo abrir solicitud de resultado WhatsApp:', resultRequestError)
    if (message.from) await sendResultPrompt(message.from, checkpoint.texto ?? 'Actividad')
  }

  let nextEstado =
    response === 'support'
      ? 'Bloqueado'
      : response === 'progress' && accion.estado === 'Bloqueado'
        ? 'Bloqueado'
        : 'En_Ejecucion'

  if (response === 'done' && accion.estado !== 'Verificado') {
    const { count, error: pendingError } = await client
      .from('accion_checkpoints')
      .select('id', { count: 'exact', head: true })
      .eq('accion_id', accion.id)
      .eq('activo', true)
      .eq('completado', false)
    if (pendingError) {
      console.error('No se pudo contar checklist pendiente por WhatsApp:', pendingError)
    } else if ((count ?? 0) === 0) {
      nextEstado = 'Hecho'
    }
  }

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
  await Promise.all(messages.map(async (message) => {
    const handledResult = await handleResultMessage(client, message)
    if (!handledResult) await handleCheckpointReply(client, message)
  }))
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
