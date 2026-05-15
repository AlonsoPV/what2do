import { corsHeaders } from './cors.ts'

const LOVABLE_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const DEFAULT_LOVABLE_MODEL = 'google/gemini-3-flash-preview'
const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

/** Límite defensivo por mensaje (proxy genérico y funciones de dominio). */
export const MAX_CHAT_MESSAGE_CHARS = 24_000
export const MAX_CHAT_MESSAGES = 64

export type ResolvedChatBackend =
  | {
      provider: 'lovable'
      apiKey: string
      baseUrl: string
      defaultModel: string
    }
  | {
      provider: 'openai_compatible'
      apiKey: string
      baseUrl: string
      defaultModel: string
    }

/**
 * Resuelve credenciales y URL de chat completions en orden:
 * 1) Lovable Cloud / gateway Lovable → `LOVABLE_API_KEY` (inyectado por Lovable; no configurar manualmente en ese entorno).
 * 2) Supabase u hospedaje externo → `OPENAI_API_KEY` + URL compatible OpenAI (`OPENAI_API_BASE_URL` opcional).
 */
export function resolveChatBackend(): ResolvedChatBackend | null {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')?.trim()
  if (lovableKey) {
    return {
      provider: 'lovable',
      apiKey: lovableKey,
      baseUrl: LOVABLE_GATEWAY_URL,
      defaultModel:
        Deno.env.get('LOVABLE_AI_MODEL')?.trim() ||
        Deno.env.get('CHAT_DEFAULT_MODEL')?.trim() ||
        DEFAULT_LOVABLE_MODEL,
    }
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim()
  if (openAiKey) {
    const rawBase = Deno.env.get('OPENAI_API_BASE_URL')?.trim()
    const baseUrl =
      rawBase && rawBase.length > 0 ?
        resolveOpenAiCompatibleChatUrl(rawBase)
      : OPENAI_CHAT_COMPLETIONS_URL

    return {
      provider: 'openai_compatible',
      apiKey: openAiKey,
      baseUrl,
      defaultModel:
        Deno.env.get('OPENAI_MODEL')?.trim() ||
        Deno.env.get('CHAT_DEFAULT_MODEL')?.trim() ||
        DEFAULT_OPENAI_MODEL,
    }
  }

  return null
}

/** Construye la URL `/v1/chat/completions` a partir de OPENAI_API_BASE_URL u origen tipo `https://api.openai.com` o `.../v1`. */
function resolveOpenAiCompatibleChatUrl(rawBase: string): string {
  const t = rawBase.replace(/\/$/, '')
  if (t.includes('/chat/completions')) return t
  if (/\/v1$/i.test(t)) return `${t}/chat/completions`
  return `${t}/v1/chat/completions`
}

/** Modelo por defecto según el backend activo (si no hay backend, modelo Lovable por defecto). */
export function getLovableModel(): string {
  const backend = resolveChatBackend()
  return backend?.defaultModel ?? DEFAULT_LOVABLE_MODEL
}

export type GatewayChatMessage = { role: string; content: string }

/** POST a Lovable Gateway o API compatible OpenAI según secreto disponible. */
export async function lovableChatCompletion(
  payload: Record<string, unknown>
): Promise<Response> {
  const backend = resolveChatBackend()
  if (!backend) {
    return new Response(
      JSON.stringify({ error: 'El servicio de IA no está configurado en el servidor.' }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }

  const model =
    typeof payload.model === 'string' && payload.model.length > 0 ?
      payload.model
    : backend.defaultModel

  return await fetch(backend.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, model }),
  })
}

export function normalizeMessages(raw: unknown): GatewayChatMessage[] {
  if (!Array.isArray(raw)) return []
  const out: GatewayChatMessage[] = []
  for (const m of raw) {
    if (m && typeof m === 'object' && 'role' in m && 'content' in m) {
      const role = String((m as { role: unknown }).role)
      const content = String((m as { content: unknown }).content ?? '')
      if (
        (role === 'user' || role === 'assistant' || role === 'system') &&
        content.length > 0 &&
        content.length <= MAX_CHAT_MESSAGE_CHARS
      ) {
        out.push({ role, content })
      }
    }
  }
  return out
}

/** Validación para proxy genérico `lovable-chat-completions`. */
export function normalizeAndClampMessages(raw: unknown): GatewayChatMessage[] | null {
  const n = normalizeMessages(raw)
  if (n.length === 0 || n.length > MAX_CHAT_MESSAGES) return null
  return n
}
