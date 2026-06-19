import { createClient } from '@supabase/supabase-js'
import { jsonResponse } from '../_shared/cors.ts'

declare global {
  var Deno: {
    env: { get(key: string): string | undefined }
    serve: (handler: (req: Request) => Response | Promise<Response>) => void
  }
}

type TelegramUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

type TelegramChat = {
  id: number
  type: string
}

type TelegramDocument = {
  file_id: string
  file_name?: string
  mime_type?: string
}

type TelegramPhotoSize = {
  file_id: string
  file_size?: number
  width: number
  height: number
}

type TelegramMessage = {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  text?: string
  caption?: string
  document?: TelegramDocument
  photo?: TelegramPhotoSize[]
}

type TelegramCallbackQuery = {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

type ChannelIdentity = {
  usuario_id: string
  external_chat_id: string
  external_user_id: string
}

type ActionDelivery = {
  accion_id: string
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function env(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Falta secreto ${name}`)
  return value
}

function optionalEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? ''
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

function fullName(user: TelegramUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || String(user.id)
}

async function telegramApi(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.description || `Telegram ${method} fallo`))
  }
  return data as Record<string, unknown>
}

async function sendMessage(chatId: string | number, text: string): Promise<void> {
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  })
}

async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  })
}

async function resolveIdentity(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client
    .from('user_channel_identities')
    .select('usuario_id,external_chat_id,external_user_id')
    .eq('channel', 'telegram')
    .eq('external_user_id', userId)
    .eq('status', 'active')
    .maybeSingle<ChannelIdentity>()
  if (error) throw error
  return data
}

async function latestActionForChat(client: ReturnType<typeof createClient>, chatId: string) {
  const { data, error } = await client
    .from('action_delivery_log')
    .select('accion_id')
    .eq('channel', 'telegram')
    .eq('external_chat_id', chatId)
    .eq('delivery_status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle<ActionDelivery>()
  if (error) throw error
  return data?.accion_id ?? null
}

function actionIdFromText(value: string | undefined): string | null {
  const match = value?.match(UUID_RE)
  return match?.[0] ?? null
}

async function logInbound(
  client: ReturnType<typeof createClient>,
  update: TelegramUpdate,
  patch: Record<string, unknown> = {}
): Promise<boolean> {
  const message = update.message ?? update.callback_query?.message
  const from = update.message?.from ?? update.callback_query?.from
  const payload = {
    channel: 'telegram',
    external_update_id: String(update.update_id),
    external_message_id: message?.message_id != null ? String(message.message_id) : null,
    external_user_id: from?.id != null ? String(from.id) : null,
    external_chat_id: message?.chat?.id != null ? String(message.chat.id) : null,
    message_type: update.callback_query ? 'callback_query' : update.message?.document ? 'document' : update.message?.photo ? 'photo' : 'message',
    payload: update as unknown as Record<string, unknown>,
    ...patch,
  }
  const { error } = await client.from('external_inbound_messages').insert(payload)
  if (error?.code === '23505') return false
  if (error) throw error
  return true
}

async function handleStart(
  client: ReturnType<typeof createClient>,
  message: TelegramMessage,
  token: string
): Promise<void> {
  const user = message.from
  if (!user) return

  const { error } = await client.rpc('link_telegram_identity', {
    p_token: token,
    p_external_user_id: String(user.id),
    p_external_chat_id: String(message.chat.id),
    p_external_username: user.username ?? null,
    p_display_name: fullName(user),
    p_metadata: { chat_type: message.chat.type },
  })

  if (error) {
    await sendMessage(message.chat.id, `No pude vincular tu Telegram: ${error.message}`)
    return
  }

  await sendMessage(
    message.chat.id,
    'Telegram vinculado al tablero. A partir de ahora puedes recibir acciones, marcar checklist y enviar evidencia por este chat.'
  )
}

async function handleCallback(
  client: ReturnType<typeof createClient>,
  callback: TelegramCallbackQuery
): Promise<void> {
  const identity = await resolveIdentity(client, String(callback.from.id))
  if (!identity) {
    await answerCallbackQuery(callback.id, 'Primero vincula tu cuenta con /start <token>.')
    return
  }

  const data = callback.data ?? ''
  const [kind, id, value] = data.split(':')

  if (kind === 'chk' && id) {
    const { data: result, error } = await client.rpc('set_accion_checkpoint_completado_for_usuario', {
      p_checkpoint_id: id,
      p_completado: value !== '0',
      p_usuario_id: identity.usuario_id,
    })
    if (error) {
      await answerCallbackQuery(callback.id, error.message)
      return
    }
    const needsEvidence = Boolean((result as { needs_evidence?: boolean } | null)?.needs_evidence)
    await answerCallbackQuery(callback.id, needsEvidence ? 'Checklist completo. Falta evidencia.' : 'Checklist actualizado.')
    return
  }

  if (kind === 'done' && id) {
    const { error } = await client.rpc('try_set_accion_hecho', {
      p_accion_id: id,
      p_usuario_id: identity.usuario_id,
    })
    await answerCallbackQuery(callback.id, error ? error.message : 'Accion marcada como Hecha.')
    return
  }

  await answerCallbackQuery(callback.id, 'Accion no reconocida.')
}

async function getTelegramFile(fileId: string): Promise<{ filePath: string; bytes: ArrayBuffer }> {
  const fileResult = await telegramApi('getFile', { file_id: fileId })
  const filePath = (fileResult.result as { file_path?: string } | undefined)?.file_path
  if (!filePath) throw new Error('Telegram no devolvio ruta del archivo.')

  const response = await fetch(`https://api.telegram.org/file/bot${env('TELEGRAM_BOT_TOKEN')}/${filePath}`)
  if (!response.ok) throw new Error('No se pudo descargar archivo de Telegram.')
  return { filePath, bytes: await response.arrayBuffer() }
}

async function handleEvidence(client: ReturnType<typeof createClient>, message: TelegramMessage): Promise<void> {
  const user = message.from
  if (!user) return

  const identity = await resolveIdentity(client, String(user.id))
  if (!identity) {
    await sendMessage(message.chat.id, 'Primero vincula tu cuenta con /start <token>.')
    return
  }

  const accionId = actionIdFromText(message.caption) ?? await latestActionForChat(client, String(message.chat.id))
  if (!accionId) {
    await sendMessage(message.chat.id, 'Recibi el archivo, pero no pude asociarlo a una accion. Reenvialo con el ID de la accion en el texto.')
    return
  }

  const photo = message.photo?.slice().sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0]
  const fileId = message.document?.file_id ?? photo?.file_id
  if (!fileId) return

  const fileName = message.document?.file_name ?? `telegram-${message.message_id}.jpg`
  const contentType = message.document?.mime_type ?? (photo ? 'image/jpeg' : 'application/octet-stream')
  const downloaded = await getTelegramFile(fileId)
  const ext = fileName.includes('.') ? fileName.split('.').pop() : downloaded.filePath.split('.').pop() ?? 'bin'
  const storagePath = `acciones/${accionId}/telegram-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await client.storage
    .from('evidencias')
    .upload(storagePath, new Blob([downloaded.bytes], { type: contentType }), {
      contentType,
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { error: rowError } = await client.from('accion_evidencias').insert({
    accion_id: accionId,
    storage_path: storagePath,
    file_name: fileName,
    content_type: contentType,
    uploaded_by: identity.usuario_id,
  })
  if (rowError) throw rowError

  const { error: flagError } = await client
    .from('acciones_diarias')
    .update({ evidencia_cargada: true, evidencia_adjunta: storagePath, updated_by: identity.usuario_id })
    .eq('id', accionId)
  if (flagError) throw flagError

  const { error: closeError } = await client.rpc('try_set_accion_hecho', {
    p_accion_id: accionId,
    p_usuario_id: identity.usuario_id,
  })

  await sendMessage(
    message.chat.id,
    closeError
      ? `Evidencia recibida en el tablero. Pendiente para cerrar: ${closeError.message}`
      : 'Evidencia recibida y accion marcada como Hecha.'
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: 'Metodo no permitido' }, 405)

  const expectedSecret = optionalEnv('TELEGRAM_WEBHOOK_SECRET')
  if (expectedSecret) {
    const receivedSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
    if (receivedSecret !== expectedSecret) return jsonResponse({ ok: false, message: 'No autorizado' }, 401)
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null
  if (!update?.update_id) return jsonResponse({ ok: false, message: 'Update invalido' }, 400)

  const client = adminClient()
  const shouldProcess = await logInbound(client, update)
  if (!shouldProcess) return jsonResponse({ ok: true, duplicate: true })

  try {
    const text = update.message?.text?.trim() ?? ''
    if (text.startsWith('/start')) {
      const token = text.split(/\s+/)[1] ?? ''
      if (!token) {
        await sendMessage(update.message!.chat.id, 'Abre tu liga de vinculacion desde el tablero para activar Telegram.')
      } else {
        await handleStart(client, update.message!, token)
      }
    } else if (update.callback_query) {
      await handleCallback(client, update.callback_query)
    } else if (update.message?.document || update.message?.photo) {
      await handleEvidence(client, update.message)
    }

    await client
      .from('external_inbound_messages')
      .update({ processed_at: new Date().toISOString() })
      .eq('channel', 'telegram')
      .eq('external_update_id', String(update.update_id))

    return jsonResponse({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo procesar Telegram'
    await client
      .from('external_inbound_messages')
      .update({ processed_at: new Date().toISOString(), error_message: message })
      .eq('channel', 'telegram')
      .eq('external_update_id', String(update.update_id))
    return jsonResponse({ ok: false, message }, 200)
  }
})
