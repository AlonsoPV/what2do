import { createClient } from '@supabase/supabase-js'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { finalizeFailedGatewayInteraction } from '../_shared/gatewayErrors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import { lovableChatCompletion, MAX_CHAT_MESSAGE_CHARS } from '../_shared/lovableGateway.ts'

const SYSTEM_PROMPT =
  'Eres un diseñador instruccional experto en operaciones O2C. ' +
  'A partir del texto de un PDF, genera un quiz de evaluacion en espanol. ' +
  'Devuelve SOLO JSON valido con la forma {"quiz":[{"question":"...","options":["...","...","...","..."],"correctIndex":0}]}. ' +
  'Cada pregunta debe tener 4 opciones, una sola correcta, correctIndex de 0 a 3, y respuestas claras.'

function parseQuiz(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const jsonText = fenced ?? trimmed
  return JSON.parse(jsonText)
}

function normalizeQuestion(q: unknown) {
  if (!q || typeof q !== 'object') return null
  const record = q as Record<string, unknown>
  const question = String(record.question ?? '').trim()
  const options = Array.isArray(record.options) ? record.options.map((o) => String(o).trim()).filter(Boolean) : []
  const correctIndex = Number(record.correctIndex)
  if (!question || options.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return null
  }
  return { question, options, correctIndex }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') return jsonResponse({ error: 'Metodo no permitido' }, 405)

  const auth = await requireAuthUser(req)
  if (!auth.ok) return auth.response

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Configuracion incompleta' }, 500)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: profile } = await adminClient
    .from('usuarios')
    .select('rol')
    .eq('user_id', auth.data.user.id)
    .maybeSingle()

  if (String(profile?.rol ?? '').trim().toLowerCase() !== 'super_admin') {
    const { data: appRole } = await adminClient
      .from('user_roles')
      .select('app_role')
      .eq('user_id', auth.data.user.id)
      .maybeSingle()

    if (appRole?.app_role !== 'super_admin') {
      return jsonResponse({ error: 'Solo super admin puede generar quizzes de academia.' }, 403)
    }
  }

  let body: { title?: string; pdfText?: string; questionCount?: number }
  try {
    body = (await req.json()) as { title?: string; pdfText?: string; questionCount?: number }
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON invalido' }, 400)
  }

  const title = String(body.title ?? '').trim().slice(0, 160)
  const pdfText = String(body.pdfText ?? '').trim()
  const questionCount = Math.min(10, Math.max(3, Number(body.questionCount) || 5))

  if (pdfText.length < 500) {
    return jsonResponse({ error: 'No se pudo extraer suficiente texto del PDF para generar preguntas.' }, 400)
  }

  const userPrompt =
    `Titulo del modulo: ${title || 'Modulo de Academia O2C'}\n` +
    `Genera ${questionCount} preguntas.\n` +
    `Texto del PDF:\n${pdfText.slice(0, MAX_CHAT_MESSAGE_CHARS - 500)}`

  const gatewayRes = await lovableChatCompletion({
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  if (!gatewayRes.ok) return finalizeFailedGatewayInteraction('academy-generate-quiz', gatewayRes)

  const data = (await gatewayRes.json()) as { choices?: { message?: { content?: string } }[] }
  const reply = data.choices?.[0]?.message?.content ?? ''

  try {
    const parsed = parseQuiz(reply) as { quiz?: unknown[] }
    const quiz = (Array.isArray(parsed.quiz) ? parsed.quiz : [])
      .map(normalizeQuestion)
      .filter((q): q is NonNullable<ReturnType<typeof normalizeQuestion>> => Boolean(q))

    if (quiz.length < 3) throw new Error('Quiz insuficiente')
    return jsonResponse({ quiz })
  } catch {
    return jsonResponse({ error: 'La IA no devolvio un quiz valido. Intenta generar de nuevo.' }, 502)
  }
})
