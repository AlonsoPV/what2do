import { createClient } from '@supabase/supabase-js'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'

declare global {
  var Deno: {
    env: { get(key: string): string | undefined }
    serve: (handler: (req: Request) => Response | Promise<Response>) => void
  }
}

type GoogleTarget = 'calendar' | 'calendar_meet' | 'task' | 'gmail'
type GoogleSource = 'accion' | 'recordatorio' | 'minuta'

type GoogleSyncPayload = {
  source?: GoogleSource
  target?: GoogleTarget
  title?: string
  description?: string
  date?: string
  dueAt?: string
  actionId?: string
  responsibleUserId?: string | null
  attendees?: string[]
}

type ResolvedUsuario = {
  id: string
  nombre: string
  email: string
}

type UsuarioEmailProfile = {
  id: string
  user_id: string | null
  nombre: string | null
  activo: boolean | null
}

const TIME_ZONE = 'America/Mexico_City'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SOURCE_LABELS: Record<GoogleSource, string> = {
  accion: 'Accion',
  recordatorio: 'Recordatorio',
  minuta: 'Minuta',
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Falta secreto ${name}`)
  return value
}

function optionalEnv(name: string, fallback: string): string {
  return Deno.env.get(name)?.trim() || fallback
}

function sanitizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

const DEFAULT_APP_BASE_URL = 'https://dev-tablero-operativo.vercel.app'

function normalizeAppBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '')
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    const hostname = url.hostname.toLowerCase()
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
    if (!isLocalhost && !hostname.includes('.')) return null
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

function appBaseUrl(): string {
  return normalizeAppBaseUrl(
    Deno.env.get('APP_BASE_URL') ||
    Deno.env.get('PUBLIC_APP_URL') ||
    Deno.env.get('SITE_URL')
  ) || DEFAULT_APP_BASE_URL
}

function sourceUrl(input: GoogleSyncPayload): string {
  const baseUrl = appBaseUrl()
  if (input.source === 'accion' && input.actionId) {
    return `${baseUrl}/kanban?accion=${encodeURIComponent(input.actionId)}`
  }
  const date =
    input.date ||
    (input.dueAt && Number.isFinite(new Date(input.dueAt).getTime())
      ? new Date(input.dueAt).toISOString().slice(0, 10)
      : '')
  if (date) {
    const tipo =
      input.source === 'recordatorio'
        ? '&tipo=recordatorios'
        : input.source === 'minuta'
          ? '&tipo=minutas'
          : ''
    return `${baseUrl}/calendario?fecha=${encodeURIComponent(date)}${tipo}`
  }
  return baseUrl
}

function parseDateTime(input: GoogleSyncPayload): Date {
  if (input.dueAt) {
    const due = new Date(input.dueAt)
    if (Number.isFinite(due.getTime())) return due
  }
  if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    const date = new Date(`${input.date}T09:00:00-06:00`)
    if (Number.isFinite(date.getTime())) return date
  }
  return new Date(Date.now() + 60 * 60 * 1000)
}

function formatDateTimeMx(date: Date): string {
  return date.toLocaleString('es-MX', {
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function buildWorkspaceDescription(input: {
  source: GoogleSource
  title: string
  description: string
  url: string
  start: Date
  responsibleName?: string
  actionId?: string
}): string {
  const lines = [
    'Tablero Operativo',
    '',
    `Tipo: ${SOURCE_LABELS[input.source]}`,
    `Fecha: ${formatDateTimeMx(input.start)}`,
    input.responsibleName ? `Responsable: ${input.responsibleName}` : '',
    input.actionId ? `Accion ID: ${input.actionId}` : '',
    '',
    'Descripcion:',
    input.description || input.title,
    '',
    'Abrir en tablero:',
    input.url,
  ]

  return lines
    .filter((line, index, array) => line !== '' || (array[index - 1] !== '' && array[index + 1] !== ''))
    .join('\n')
}

function toRfc2822(input: { from: string; to: string[]; subject: string; text: string }): string {
  return [
    `From: ${input.from}`,
    `To: ${input.to.join(', ')}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.text,
  ].join('\r\n')
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function googleAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || typeof data?.access_token !== 'string') {
    throw new Error(data?.error_description || data?.error || 'No se pudo obtener token de Google')
  }
  return data.access_token
}

async function googleJson<T>(url: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error_description || 'Google rechazo la solicitud')
  }
  return data as T
}

async function resolveUsuarios(
  adminClient: ReturnType<typeof createClient>,
  ids: string[]
): Promise<ResolvedUsuario[]> {
  const uniqueIds = [...new Set(ids.filter((id) => UUID_RE.test(id)))]
  if (uniqueIds.length === 0) return []

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id,user_id,nombre,activo')
    .in('id', uniqueIds)
    .returns<UsuarioEmailProfile[]>()
  if (error || !data) return []

  const users = await Promise.all(
    data
      .filter((profile) => profile.activo !== false && profile.user_id)
      .map(async (profile) => {
        const result = await adminClient.auth.admin.getUserById(profile.user_id!)
        const email = result.data.user?.email?.trim() ?? ''
        if (!email) return null
        return {
          id: profile.id,
          nombre: profile.nombre?.trim() || email,
          email,
        }
      })
  )

  const uniqueByEmail = new Map<string, ResolvedUsuario>()
  for (const user of users) {
    if (user) uniqueByEmail.set(user.email, user)
  }
  return [...uniqueByEmail.values()]
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Metodo no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  try {
    const body = (await req.json().catch(() => null)) as GoogleSyncPayload | null
    const source = body?.source
    const target = body?.target
    if (!source || !target) return jsonResponse({ ok: false, message: 'source y target son requeridos' }, 400)

    const title = sanitizeText(body.title, 'Elemento del tablero')
    const description = sanitizeText(body.description)
    const token = await googleAccessToken()
    const adminClient = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const currentEmail = auth.data.user.email?.trim() ?? ''
    const start = parseDateTime(body)
    const resolvedUsers = await resolveUsuarios(adminClient, body.responsibleUserId ? [body.responsibleUserId] : [])
    const profileEmails = resolvedUsers.map((profile) => profile.email)
    const responsibleName = body.responsibleUserId
      ? resolvedUsers.find((profile) => profile.id === body.responsibleUserId)?.nombre
      : undefined
    const explicitAttendees = Array.isArray(body.attendees) ? body.attendees : []
    const recipients = [...new Set([...explicitAttendees, ...profileEmails, currentEmail].filter(Boolean))]
    const url = sourceUrl(body)
    const details = buildWorkspaceDescription({
      source,
      title,
      description,
      url,
      start,
      responsibleName,
      actionId: body.actionId,
    })

    if (target === 'task') {
      const tasklist = encodeURIComponent(optionalEnv('GOOGLE_TASKLIST_ID', '@default'))
      const task = await googleJson<{ id?: string; title?: string; webViewLink?: string }>(
        `https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`,
        token,
        {
          title,
          notes: details,
          due: start.toISOString(),
        }
      )
      return jsonResponse({ ok: true, target, id: task.id ?? null, url: task.webViewLink ?? null })
    }

    if (target === 'gmail') {
      const to = recipients.length > 0 ? recipients : currentEmail ? [currentEmail] : []
      if (to.length === 0) return jsonResponse({ ok: false, message: 'No hay destinatarios para Gmail' }, 400)
      const from = optionalEnv('GOOGLE_GMAIL_FROM', 'me')
      const message = toRfc2822({
        from,
        to,
        subject: `[Tablero] ${title}`,
        text: details || title,
      })
      const sent = await googleJson<{ id?: string }>(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        token,
        { raw: base64Url(message) }
      )
      return jsonResponse({ ok: true, target, id: sent.id ?? null, recipients: to })
    }

    const end = addMinutes(start, source === 'accion' ? 30 : 60)
    const calendarId = encodeURIComponent(optionalEnv('GOOGLE_CALENDAR_ID', 'primary'))
    const withMeet = target === 'calendar_meet'
    const event = await googleJson<{ id?: string; htmlLink?: string; hangoutLink?: string }>(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendUpdates=all${
        withMeet ? '&conferenceDataVersion=1' : ''
      }`,
      token,
      {
        summary: title,
        description: details,
        start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
        attendees: recipients.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
        conferenceData: withMeet
          ? { createRequest: { requestId: crypto.randomUUID().replaceAll('-', '') } }
          : undefined,
      }
    )
    return jsonResponse({
      ok: true,
      target,
      id: event.id ?? null,
      url: event.htmlLink ?? null,
      meetUrl: event.hangoutLink ?? null,
    })
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : 'No se pudo sincronizar con Google' },
      500
    )
  }
})
