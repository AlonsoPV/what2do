import {
  fetchAiWithRetry,
  getAiFunctionsBaseUrl,
  getAiInvocationHeaders,
  readAiErrorJSON,
} from '@/features/ai-support/services/aiFunctionsClient'

const NAME = 'ai-chat'

/** Respuesta puntual §4.1 docs/ia.md */
export async function askAiChat(message: string): Promise<string> {
  const trimmed = message.trim()
  if (!trimmed) throw new Error('Escribe un mensaje.')

  const url = `${getAiFunctionsBaseUrl()}/${NAME}`
  const headers = await getAiInvocationHeaders()
  const resp = await fetchAiWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: trimmed }),
  })

  if (!resp.ok) {
    const extra = await readAiErrorJSON(resp)
    throw new Error(
      extra ??
        (resp.status === 402
          ? 'Créditos de IA insuficientes.'
          : resp.status === 429
            ? 'Demasiadas solicitudes. Espera un momento.'
            : 'Error al consultar la IA.')
    )
  }

  const data = (await resp.json()) as { reply?: string; error?: string }
  if (typeof data.error === 'string') throw new Error(data.error)
  if (typeof data.reply !== 'string') throw new Error('Respuesta inesperada del servidor')
  return data.reply
}
