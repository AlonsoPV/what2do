import {
  fetchAiWithRetry,
  getAiFunctionsBaseUrl,
  getAiInvocationHeaders,
  readAiErrorJSON,
} from '@/features/ai-support/services/aiFunctionsClient'

const NAME = 'ai-insights'

export type InsightMode = 'gap_risk' | 'kpi_assist'

export async function fetchAiInsights(payload: {
  mode: InsightMode
  gap_name?: string
  user_message?: string
  context?: string
}): Promise<{ reply: string | Record<string, unknown>; parseWarning?: string }> {
  const url = `${getAiFunctionsBaseUrl()}/${NAME}`
  const headers = await getAiInvocationHeaders()
  const resp = await fetchAiWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const extra = await readAiErrorJSON(resp)
    throw new Error(extra ?? 'No se pudieron obtener los insights.')
  }

  const data = (await resp.json()) as {
    reply?: string | Record<string, unknown>
    parseWarning?: string
    error?: string
  }
  if (typeof data.error === 'string') throw new Error(data.error)
  if (data.reply === undefined) throw new Error('Respuesta incompleta del servidor.')
  return { reply: data.reply, parseWarning: data.parseWarning }
}
