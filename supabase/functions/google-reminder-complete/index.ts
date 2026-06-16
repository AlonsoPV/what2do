import { createClient } from '@supabase/supabase-js'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'

declare global {
  var Deno: {
    env: { get(key: string): string | undefined }
    serve: (handler: (req: Request) => Response | Promise<Response>) => void
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function env(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Falta secreto ${name}`)
  return value
}

function optionalEnv(name: string, fallback: string): string {
  return Deno.env.get(name)?.trim() || fallback
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

async function googlePatch(url: string, token: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (response.status === 404 || response.status === 410) return
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error?.message || data?.error_description || 'Google rechazo la solicitud')
  }
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
    const body = (await req.json().catch(() => null)) as { reminderId?: string } | null
    const reminderId = body?.reminderId?.trim()
    if (!reminderId || !UUID_RE.test(reminderId)) {
      return jsonResponse({ ok: false, message: 'reminderId es requerido' }, 400)
    }

    const adminClient = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const { data: usuario, error: usuarioError } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('user_id', auth.data.user.id)
      .maybeSingle()
    if (usuarioError || !usuario?.id) {
      return jsonResponse({ ok: false, message: 'Perfil de usuario no encontrado' }, 403)
    }

    const { data: reminder, error: reminderError } = await adminClient
      .from('calendar_reminders')
      .select('id,google_calendar_event_id,google_task_id')
      .eq('id', reminderId)
      .eq('user_id', usuario.id)
      .maybeSingle()
    if (reminderError || !reminder) {
      return jsonResponse({ ok: false, message: 'Recordatorio no encontrado' }, 404)
    }

    const hadGoogleLinks = Boolean(reminder.google_calendar_event_id || reminder.google_task_id)
    if (!hadGoogleLinks) {
      return jsonResponse({
        ok: true,
        hadGoogleLinks: false,
        calendarCancelled: false,
        taskCompleted: false,
      })
    }

    const token = await googleAccessToken()
    const warnings: string[] = []
    let calendarCancelled = false
    let taskCompleted = false

    if (reminder.google_calendar_event_id) {
      try {
        const calendarId = encodeURIComponent(optionalEnv('GOOGLE_CALENDAR_ID', 'primary'))
        const eventId = encodeURIComponent(reminder.google_calendar_event_id)
        await googlePatch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          token,
          { status: 'cancelled' }
        )
        calendarCancelled = true
      } catch (error) {
        warnings.push(
          error instanceof Error ? error.message : 'No se pudo cancelar el evento en Google Calendar'
        )
      }
    }

    if (reminder.google_task_id) {
      try {
        const tasklist = encodeURIComponent(optionalEnv('GOOGLE_TASKLIST_ID', '@default'))
        const taskId = encodeURIComponent(reminder.google_task_id)
        await googlePatch(
          `https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${taskId}`,
          token,
          { status: 'completed', completed: new Date().toISOString() }
        )
        taskCompleted = true
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'No se pudo completar la tarea en Google Tasks')
      }
    }

    return jsonResponse({
      ok: warnings.length === 0,
      hadGoogleLinks: true,
      calendarCancelled,
      taskCompleted,
      warnings,
      message: warnings[0],
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'No se pudo sincronizar el cierre con Google',
      },
      500
    )
  }
})
