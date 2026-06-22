/** CORS para Edge Functions (invoke desde navegador / localhost). */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

/** Devuelve respuesta OPTIONS o null si debe continuar el handler. */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
  return null
}

type ServeHandler = (req: Request) => Response | Promise<Response>

/** Asegura cabeceras CORS incluso en errores no capturados del handler. */
export function serveWithCors(handler: ServeHandler): void {
  Deno.serve(async (req) => {
    const preflight = handleCorsPreflight(req)
    if (preflight) return preflight

    try {
      return await handler(req)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno'
      return jsonResponse({ ok: false, message }, 500)
    }
  })
}
