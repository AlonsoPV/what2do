import { createClient } from '@supabase/supabase-js'

type InviteUserPayload = {
  email?: string
  nombre?: string
  rol?: string
  area?: string | null
  activo?: boolean
  onboarding_completed?: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, message: 'Método no permitido' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, message: 'Faltan credenciales de Supabase' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ ok: false, message: 'No autorizado' }, 401)
  }

  const token = authHeader.slice(7)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !userData.user) {
    return json({ ok: false, message: 'Sesión inválida' }, 401)
  }

  const { data: roleRow, error: roleError } = await adminClient
    .from('user_roles')
    .select('app_role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (roleError) {
    return json({ ok: false, message: 'No se pudo validar permisos' }, 500)
  }

  if (!roleRow || !['admin', 'super_admin'].includes(roleRow.app_role)) {
    return json({ ok: false, message: 'Solo administradores pueden invitar usuarios' }, 403)
  }

  const body = (await req.json().catch(() => null)) as InviteUserPayload | null
  const email = normalizeText(body?.email).toLowerCase()
  const nombre = normalizeText(body?.nombre)
  const rol = normalizeText(body?.rol)
  const area = normalizeText(body?.area)

  if (!email || !nombre || !rol) {
    return json({ ok: false, message: 'Correo, nombre y rol son obligatorios' }, 400)
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        nombre,
        rol,
        area: area || undefined,
        activo: body?.activo ?? true,
        onboarding_completed: body?.onboarding_completed ?? false,
      },
    }
  )

  if (inviteError) {
    const message = inviteError.message || 'No se pudo enviar la invitación'
    const status = /already|exists|registered/i.test(message) ? 409 : 400
    return json({ ok: false, message }, status)
  }

  return json({
    ok: true,
    message: 'Invitación enviada correctamente',
    email,
    user_id: inviteData.user?.id ?? null,
  })
})
