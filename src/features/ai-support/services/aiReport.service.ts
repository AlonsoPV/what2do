import {
  fetchAiWithRetry,
  getAiFunctionsBaseUrl,
  getAiInvocationHeaders,
  readAiErrorJSON,
} from '@/features/ai-support/services/aiFunctionsClient'

const NAME = 'ai-report'

export async function generateSprintReport(sprint_data: string): Promise<string> {
  const trimmed = sprint_data.trim()
  if (!trimmed) throw new Error('Describe los datos o avances del sprint.')

  const url = `${getAiFunctionsBaseUrl()}/${NAME}`
  const headers = await getAiInvocationHeaders()
  const resp = await fetchAiWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sprint_data: trimmed }),
  })

  if (!resp.ok) {
    const extra = await readAiErrorJSON(resp)
    throw new Error(extra ?? 'No se pudo generar el reporte.')
  }

  const data = (await resp.json()) as { reply?: string; error?: string }
  if (typeof data.error === 'string') throw new Error(data.error)
  if (typeof data.reply !== 'string') throw new Error('Respuesta inesperada del servidor.')
  return data.reply
}
