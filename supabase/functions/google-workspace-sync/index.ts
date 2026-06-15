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

type UsuarioEmailProfile = {
  id: string
  user_id: string | null
  nombre: string | null
  activo: boolean | null
}

const TIME_ZONE = 'America/Mexico_City'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function appBaseUrl(): string {
  return (
    Deno.env.get('APP_BASE_URL') ||
    Deno.env.get('PUBLIC_APP_URL') ||
    Deno.env.get('SITE_URL') ||
    'https://dev-tablero-operativo.vercel.app'
  ).replace(/\/+$/, '')
}

function sourceUrl(input: GoogleSyncPayload): string {
  if (input.source === 'accion' && input.actionId) {
    return `${appBaseUrl()}/kanban?accion=${encodeURIComponent(input.actionId)}`
  }
  if (input.date) {
    return `${appBaseUrl()}/calendario?fecha=${encodeURIComponent(input.date)}`
  }
  return appBaseUrl()
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

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
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

async function resolveUsuarioEmails(
  adminClient: ReturnType<typeof createClient>,
  ids: string[]
): Promise<string[]> {
  const uniqueIds = [...new Set(ids.filter((id) => UUID_RE.test(id)))]
  if (uniqueIds.length === 0) return []

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id,user_id,nombre,activo')
    .in('id', uniqueIds)
    .returns<UsuarioEmailProfile[]>()
  if (error || !data) return []

  const emails = await Promise.all(
    data
      .filter((profile) => profile.activo !== false && profile.user_id)
      .map(async (profile) => {
        const result = await adminClient.auth.admin.getUserById(profile.user_id!)
        return result.data.user?.email?.trim() ?? ''
      })
  )

  return [...new Set(emails.filter(Boolean))]
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
    const profileEmails = await resolveUsuarioEmails(
      adminClient,
      body.responsibleUserId ? [body.responsibleUserId] : []
    )
    const explicitAttendees = Array.isArray(body.attendees) ? body.attendees : []
    const recipients = [...new Set([...explicitAttendees, ...profileEmails, currentEmail].filter(Boolean))]
    const url = sourceUrl(body)
    const details = [description, '', `Abrir en tablero: ${url}`].filter(Boolean).join('\n')

    if (target === 'task') {
      const due = parseDateTime(body)
      const tasklist = encodeURIComponent(optionalEnv('GOOGLE_TASKLIST_ID', '@default'))
      const task = await googleJson<{ id?: string; title?: string; webViewLink?: string }>(
        `https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`,
        token,
        {
          title,
          notes: details,
          due: due.toISOString(),
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

    const start = parseDateTime(body)
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
