import { jsonResponse } from './cors.ts'

/** Descarta el cuerpo upstream sin registrar contenido (puede incluir datos del proveedor). */
export async function discardResponseBodySafe(res: Response): Promise<void> {
  try {
    await res.arrayBuffer()
  } catch {
    /* ignore */
  }
}

/** Registra únicamente el código HTTP — nunca cuerpo, cabeceras ni secretos. */
export function logChatUpstreamFailure(handlerName: string, upstreamStatus: number): void {
  console.error(`[${handlerName}] chat_upstream_http_status=${upstreamStatus}`)
}

/**
 * Traduce errores HTTP del proveedor upstream a respuesta JSON para el cliente.
 * No incluye texto crudo del proveedor (evita filtrado accidental de datos sensibles).
 */
export function jsonForFailedChatUpstream(upstreamStatus: number): Response {
  switch (upstreamStatus) {
    case 429:
      return jsonResponse({ error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' }, 429)
    case 402:
      return jsonResponse({ error: 'Créditos de IA insuficientes. Revisa tu workspace.' }, 402)
    case 503:
      return jsonResponse({ error: 'El servicio de IA no está disponible temporalmente. Intenta más tarde.' }, 503)
    case 500:
      return jsonResponse({ error: 'Error interno en el proveedor de IA. Intenta de nuevo más tarde.' }, 502)
    default:
      return jsonResponse({ error: 'No se pudo completar la solicitud al servicio de IA.' }, 502)
  }
}

export async function finalizeFailedGatewayInteraction(
  handlerName: string,
  gatewayRes: Response
): Promise<Response> {
  const status = gatewayRes.status
  logChatUpstreamFailure(handlerName, status)
  await discardResponseBodySafe(gatewayRes)
  return jsonForFailedChatUpstream(status)
}
