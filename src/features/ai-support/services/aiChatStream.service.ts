import type { AiChatMessage } from '@/features/ai-support/types'
import {
  fetchAiWithRetry,
  getAiFunctionsBaseUrl,
  getAiInvocationHeaders,
  readAiErrorJSON,
} from '@/features/ai-support/services/aiFunctionsClient'

const NAME = 'ai-chat-stream'

/** Itera deltas de contenido del asistente (SSE desde el gateway). */
export async function* streamAiChat(
  messages: AiChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (!messages.some((m) => m.role === 'user')) {
    throw new Error('Añade al menos un mensaje de usuario.')
  }

  const url = `${getAiFunctionsBaseUrl()}/${NAME}`
  const headers = await getAiInvocationHeaders()
  const resp = await fetchAiWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!resp.ok || !resp.body) {
    const extra = await readAiErrorJSON(resp)
    throw new Error(
      extra ??
        (resp.status === 402
          ? 'Créditos insuficientes.'
          : resp.status === 429
            ? 'Límite de velocidad. Intenta más tarde.'
            : 'Fallo al iniciar respuesta en streaming.')
    )
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        if (line.endsWith('\r')) line = line.slice(0, -1)
        if (!line.startsWith('data: ')) continue

        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]') return

        try {
          const parsed = JSON.parse(jsonStr) as {
            choices?: { delta?: { content?: string } }[]
          }
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          buffer = `${line}\n${buffer}`
          break
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
