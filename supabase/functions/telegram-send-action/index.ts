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
  message_type?: 'initial' | 'checkpoint_followup' | 'commitment_close'
  checkpoint_id?: string
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
  created_at: string
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

function normalizeDescriptionForTelegram(text: string): string {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/^\s*(c.{1,2}mo|quiero|para qu.{1,2}|cuando):\s*/gim, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .join('\n\n')
    .trim()
  return normalized || 'Sin descripcion.'
}

function actionTitle(accion: Accion): string {
  return accion.titulo_accion?.trim() || accion.descripcion_accion.slice(0, 72)
}

function checkpointListText(checkpoints: Checkpoint[]): string {
  const visibleCheckpoints = checkpoints.slice(0, TELEGRAM_MAX_INLINE_BUTTONS)
  const hiddenCheckpoints = Math.max(0, checkpoints.length - visibleCheckpoints.length)
  return visibleCheckpoints.length
    ? [
        ...visibleCheckpoints.map((c, i) => `${c.completado ? '[x]' : '[ ]'} ${i + 1}. ${c.texto}`),
        hiddenCheckpoints > 0 ? `... ${hiddenCheckpoints} puntos mas en el tablero.` : '',
      ].filter(Boolean).join('\n')
    : 'Sin checklist configurado.'
}

function buildInitialMessage(accion: Accion, responsable: Usuario | null, checkpoints: Checkpoint[]): string {
  const title = actionTitle(accion)
  const link = actionUrl(accion.id)
  const description = truncateText(normalizeDescriptionForTelegram(accion.descripcion_accion), 1200)

  return fitTelegramMessage([
    'Nueva accion asignada',
    '',
    title,
    '',
    'Datos',
    `Fecha de creacion: ${accion.created_at?.slice(0, 16).replace('T', ' ')}`,
    `Fecha compromiso: ${accion.fecha} ${accion.hora_limite?.slice(0, 5)}`,
    accion.prioridad ? `Prioridad: ${accion.prioridad}` : '',
    responsable?.nombre ? `Responsable: ${responsable.nombre}` : 'Responsable: sin asignar',
    `ID: ${accion.id}`,
    '',
    'Descripcion:',
    description,
    '',
    'Actividades/checks:',
    checkpointListText(checkpoints),
    '',
    link ? `Tablero: ${link}` : '',
  ].filter(Boolean).join('\n'))
}

function buildCheckpointFollowupMessage(accion: Accion, checkpoint: Checkpoint): string {
  return fitTelegramMessage([
    'Seguimiento de actividad',
    '',
    `Accion: ${actionTitle(accion)}`,
    `Fecha compromiso: ${accion.fecha} ${accion.hora_limite?.slice(0, 5)}`,
    '',
    `Como te fue con esta actividad?`,
    checkpoint.texto,
    '',
    `ID accion: ${accion.id}`,
  ].join('\n'))
}

function buildCommitmentCloseMessage(accion: Accion, responsable: Usuario | null, checkpoints: Checkpoint[]): string {
  const completed = checkpoints.filter((c) => c.completado).length
  const total = checkpoints.length

  return fitTelegramMessage([
    'Fecha compromiso',
    '',
    `Accion: ${actionTitle(accion)}`,
    responsable?.nombre ? `Responsable: ${responsable.nombre}` : '',
    `Compromiso: ${accion.fecha} ${accion.hora_limite?.slice(0, 5)}`,
    total > 0 ? `Avance de actividades: ${completed}/${total}` : 'Sin checklist configurado.',
    '',
    'Pudiste cerrar todas las actividades?',
    '',
    checkpointListText(checkpoints),
    '',
    `ID accion: ${accion.id}`,
  ].filter(Boolean).join('\n'))
}

serveWithCors(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: 'Metodo no permitido' }, 405)

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  const body = (await req.json().catch(() => null)) as SendActionPayload | null
  const accionId = body?.accion_id?.trim() ?? ''
  if (!UUID_RE.test(accionId)) return jsonResponse({ ok: false, message: 'accion_id invalido' }, 400)
  const messageType = body?.message_type ?? 'initial'
  if (!['initial', 'checkpoint_followup', 'commitment_close'].includes(messageType)) {
    return jsonResponse({ ok: false, message: 'message_type invalido' }, 400)
  }

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
    .select('id,titulo_accion,descripcion_accion,responsable,created_by,created_at,fecha,hora_limite,prioridad,evidencia_esperada,estado')
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
  const checkpointId = body?.checkpoint_id?.trim() ?? ''
  const checkpoint = checkpointId ? checkpointRows.find((row) => row.id === checkpointId) : null
  if (messageType === 'checkpoint_followup' && !checkpoint) {
    return jsonResponse({ ok: false, message: 'checkpoint_id invalido o no pertenece a la accion' }, 400)
  }
  const text =
    messageType === 'checkpoint_followup'
      ? buildCheckpointFollowupMessage(accion, checkpoint!)
      : messageType === 'commitment_close'
        ? buildCommitmentCloseMessage(accion, targetUser ?? null, checkpointRows)
        : buildInitialMessage(accion, targetUser ?? null, checkpointRows)
  let telegramResult: Record<string, unknown>
  try {
    telegramResult = await telegramApi('sendMessage', {
      chat_id: identity.external_chat_id,
      text,
      disable_web_page_preview: true,
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
      payload: { sent_by: currentUser.id, message_type: messageType, checkpoint_id: checkpoint?.id ?? null },
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
    payload: { sent_by: currentUser.id, message_type: messageType, checkpoint_id: checkpoint?.id ?? null },
    sent_at: new Date().toISOString(),
  })
  if (logError) {
    return jsonResponse({ ok: true, warning: 'Mensaje enviado, pero no se pudo guardar log', telegram_message_id: messageId ?? null })
  }

  return jsonResponse({ ok: true, telegram_message_id: messageId ?? null })
})
