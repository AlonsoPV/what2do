import { createClient } from '@supabase/supabase-js'
import { jsonResponse, serveWithCors } from '../_shared/cors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'

declare global {
  var Deno: {
    env: { get(key: string): string | undefined }
    serve: (handler: (req: Request) => Response | Promise<Response>) => void
  }
}

type SendActionPayload = {
  accion_id?: string
  usuario_id?: string
}

type Usuario = {
  id: string
  user_id: string
  nombre: string | null
  rol: string | null
  activo: boolean | null
}

type Accion = {
  id: string
  titulo_accion: string | null
  descripcion_accion: string
  responsable: string
  created_by: string | null
  fecha: string
  hora_limite: string
  prioridad: string | null
  evidencia_esperada: string
  estado: string
}

type Checkpoint = {
  id: string
  texto: string
  orden: number
  completado: boolean
}

type Identity = {
  usuario_id: string
  external_chat_id: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096
const TELEGRAM_SAFETY_MARGIN = 128
const TELEGRAM_MAX_INLINE_BUTTONS = 95

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

function appBaseUrl(): string {
  return (optionalEnv('APP_BASE_URL') || optionalEnv('PUBLIC_APP_URL') || optionalEnv('SITE_URL') || '').replace(/\/+$/, '')
}

function actionUrl(accionId: string): string {
  const base = appBaseUrl()
  return base ? `${base}/kanban?accion=${encodeURIComponent(accionId)}` : ''
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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 15)).trimEnd()}\n[truncado]`
}

function fitTelegramMessage(text: string): string {
  return truncateText(text, TELEGRAM_MAX_MESSAGE_LENGTH - TELEGRAM_SAFETY_MARGIN)
}

function buildMessage(accion: Accion, responsable: Usuario | null, checkpoints: Checkpoint[]): string {
  const title = accion.titulo_accion?.trim() || accion.descripcion_accion.slice(0, 72)
  const visibleCheckpoints = checkpoints.slice(0, TELEGRAM_MAX_INLINE_BUTTONS)
  const hiddenCheckpoints = Math.max(0, checkpoints.length - visibleCheckpoints.length)
  const checklistText = visibleCheckpoints.length
    ? [
        ...visibleCheckpoints.map((c, i) => `${c.completado ? '[x]' : '[ ]'} ${i + 1}. ${c.texto}`),
        hiddenCheckpoints > 0 ? `... ${hiddenCheckpoints} puntos mas en el tablero.` : '',
      ].filter(Boolean).join('\n')
    : 'Sin checklist configurado.'
  const link = actionUrl(accion.id)

  return fitTelegramMessage([
    `Accion: ${title}`,
    `ID: ${accion.id}`,
    responsable?.nombre ? `Responsable: ${responsable.nombre}` : '',
    `Fecha limite: ${accion.fecha} ${accion.hora_limite}`,
    accion.prioridad ? `Prioridad: ${accion.prioridad}` : '',
    '',
    'Descripcion:',
    accion.descripcion_accion.slice(0, 900),
    '',
    'Evidencia esperada:',
    accion.evidencia_esperada,
    '',
    'Checklist:',
    checklistText,
    '',
    'Para enviar evidencia, responde a este chat con el archivo. Si tienes varias acciones abiertas, incluye el ID de la accion en el caption.',
    link ? `Abrir tablero: ${link}` : '',
  ].filter(Boolean).join('\n'))
}

function buildReplyMarkup(accion: Accion, checkpoints: Checkpoint[]): Record<string, unknown> {
  const rows = checkpoints.slice(0, TELEGRAM_MAX_INLINE_BUTTONS).map((checkpoint, index) => ([{
    text: `${checkpoint.completado ? 'Desmarcar' : 'Marcar'} ${index + 1}`,
    callback_data: `chk:${checkpoint.id}:${checkpoint.completado ? '0' : '1'}`,
  }]))
  rows.push([{ text: 'Marcar accion como Hecha', callback_data: `done:${accion.id}` }])
  return { inline_keyboard: rows }
}

serveWithCors(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: 'Metodo no permitido' }, 405)

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => null)) as SendActionPayload | null
  const accionId = body?.accion_id?.trim() ?? ''
  if (!UUID_RE.test(accionId)) return jsonResponse({ ok: false, message: 'accion_id invalido' }, 400)

  const client = adminClient()

  const { data: currentUser, error: currentUserError } = await client
    .from('usuarios')
    .select('id,user_id,nombre,rol,activo')
    .eq('user_id', auth.data.user.id)
    .maybeSingle<Usuario>()
  if (currentUserError) return jsonResponse({ ok: false, message: 'No se pudo resolver usuario actual' }, 500)
  if (!currentUser?.id || currentUser.activo === false) {
    return jsonResponse({ ok: false, message: 'Usuario actual sin perfil activo' }, 403)
  }

  const { data: accion, error: accionError } = await client
    .from('acciones_diarias')
    .select('id,titulo_accion,descripcion_accion,responsable,created_by,fecha,hora_limite,prioridad,evidencia_esperada,estado')
    .eq('id', accionId)
    .maybeSingle<Accion>()
  if (accionError) return jsonResponse({ ok: false, message: 'No se pudo leer la accion' }, 500)
  if (!accion) return jsonResponse({ ok: false, message: 'Accion no encontrada' }, 404)

  const targetUsuarioId = body?.usuario_id?.trim() || accion.responsable
  if (!UUID_RE.test(targetUsuarioId)) return jsonResponse({ ok: false, message: 'usuario_id invalido' }, 400)

  const { data: targetUser } = await client
    .from('usuarios')
    .select('id,user_id,nombre,rol,activo')
    .eq('id', targetUsuarioId)
    .maybeSingle<Usuario>()
  if (!targetUser?.id || targetUser.activo === false) {
    return jsonResponse({ ok: false, message: 'Responsable no encontrado o inactivo' }, 404)
  }

  const { data: identity, error: identityError } = await client
    .from('user_channel_identities')
    .select('usuario_id,external_chat_id')
    .eq('channel', 'telegram')
    .eq('usuario_id', targetUsuarioId)
    .eq('status', 'active')
    .maybeSingle<Identity>()
  if (identityError) return jsonResponse({ ok: false, message: 'No se pudo buscar Telegram del responsable' }, 500)
  if (!identity?.external_chat_id) {
    return jsonResponse({ ok: false, message: 'El usuario aun no tiene Telegram vinculado' }, 409)
  }

  const { data: checkpoints, error: checkpointsError } = await client
    .from('accion_checkpoints')
    .select('id,texto,orden,completado')
    .eq('accion_id', accionId)
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true })
  if (checkpointsError) return jsonResponse({ ok: false, message: 'No se pudo leer checklist' }, 500)

  const checkpointRows = (checkpoints ?? []) as Checkpoint[]
  const text = buildMessage(accion, targetUser ?? null, checkpointRows)
  let telegramResult: Record<string, unknown>
  try {
    telegramResult = await telegramApi('sendMessage', {
      chat_id: identity.external_chat_id,
      text,
      disable_web_page_preview: true,
      reply_markup: buildReplyMarkup(accion, checkpointRows),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Telegram rechazo el envio'
    await client.from('action_delivery_log').insert({
      accion_id: accion.id,
      usuario_id: targetUsuarioId,
      channel: 'telegram',
      external_chat_id: identity.external_chat_id,
      delivery_status: 'failed',
      error_message: message,
      payload: { sent_by: currentUser.id },
    })
    return jsonResponse({ ok: false, message }, 502)
  }

  const messageId = (telegramResult.result as { message_id?: number } | undefined)?.message_id
  const { error: logError } = await client.from('action_delivery_log').insert({
    accion_id: accion.id,
    usuario_id: targetUsuarioId,
    channel: 'telegram',
    external_chat_id: identity.external_chat_id,
    external_message_id: messageId != null ? String(messageId) : null,
    delivery_status: 'sent',
    payload: { sent_by: currentUser.id },
    sent_at: new Date().toISOString(),
  })
  if (logError) {
    return jsonResponse({ ok: true, warning: 'Mensaje enviado, pero no se pudo guardar log', telegram_message_id: messageId ?? null })
  }

  return jsonResponse({ ok: true, telegram_message_id: messageId ?? null })
})
