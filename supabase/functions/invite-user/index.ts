import { createClient } from '@supabase/supabase-js'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { requireAuthUser } from '../_shared/requireUser.ts'
import { canInviteUsers } from '../_shared/invitePermissions.ts'

/** Stubs para el checker de TypeScript del repo (runtime = Deno en Supabase Edge). */
declare global {
  // eslint-disable-next-line no-var
  var Deno: {
    env: { get(key: string): string | undefined }
    serve: (handler: (req: Request) => Response | Promise<Response>) => void
  }
}

type InviteUserPayload = {
  email?: string
  nombre?: string
  rol?: string
  area?: string | null
  activo?: boolean
}

const DEFAULT_INITIAL_PASSWORD = 'emx@2026'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Metodo no permitido' }, 405)
  }

  const auth = await requireAuthUser(req)
  if (!auth.ok) {
    const payload = await auth.response.json().catch(() => ({})) as { error?: string }
    const message =
      payload.error === 'Sesión inválida'
        ? 'Sesion invalida'
        : payload.error === 'No autorizado'
          ? 'No autorizado'
          : 'No se pudo validar permisos'
    const status = auth.response.status === 401 ? 401 : auth.response.status
    return jsonResponse({ ok: false, message }, status)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, message: 'Faltan credenciales de Supabase' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const callerId = auth.data.user.id

  const { data: roleRow, error: roleError } = await adminClient
    .from('user_roles')
    .select('app_role')
    .eq('user_id', callerId)
    .maybeSingle()

  if (roleError) {
    return jsonResponse({ ok: false, message: 'No se pudo validar permisos' }, 500)
  }

  const { data: businessRoleRow, error: businessRoleError } = await adminClient
    .from('usuarios')
    .select('rol, activo')
    .eq('user_id', callerId)
    .maybeSingle()

  if (businessRoleError) {
    return jsonResponse({ ok: false, message: 'No se pudo validar permisos' }, 500)
  }

  if (
    !canInviteUsers({
      appRole: roleRow?.app_role,
      businessRol: businessRoleRow?.rol,
      activo: businessRoleRow?.activo,
    })
  ) {
    return jsonResponse(
      { ok: false, message: 'Solo administradores pueden invitar usuarios' },
      403
    )
  }

  const body = (await req.json().catch(() => null)) as InviteUserPayload | null
  const email = normalizeText(body?.email).toLowerCase()
  const nombre = normalizeText(body?.nombre)
  const rol = normalizeText(body?.rol)
  const area = normalizeText(body?.area)

  if (!email || !nombre || !rol) {
    return jsonResponse({ ok: false, message: 'Correo, nombre y rol son obligatorios' }, 400)
  }

  const userMetadata = {
    nombre,
    rol,
    area: area || undefined,
    activo: body?.activo ?? true,
  }

  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: DEFAULT_INITIAL_PASSWORD,
    email_confirm: true,
    user_metadata: userMetadata,
  })

  if (createError) {
    const message = createError.message || 'No se pudo crear el usuario'
    const status = /already|exists|registered/i.test(message) ? 409 : 400
    return jsonResponse({ ok: false, message }, status)
  }

  const invitedUserId = createData.user?.id
  if (!invitedUserId) {
    return jsonResponse(
      { ok: false, message: 'No se pudo obtener el identificador del usuario creado' },
      500
    )
  }

  const { error: profileUpsertError } = await adminClient.from('usuarios').upsert(
    {
      user_id: invitedUserId,
      nombre,
      rol,
      area: area || null,
      activo: body?.activo ?? true,
    },
    { onConflict: 'user_id' }
  )

  if (profileUpsertError) {
    return jsonResponse(
      {
        ok: false,
        message:
          profileUpsertError.message || 'Usuario creado, pero no se pudo registrar su perfil',
      },
      500
    )
  }

  const { error: roleInsertError } = await adminClient.from('user_roles').upsert(
    { user_id: invitedUserId, app_role: 'viewer' },
    { onConflict: 'user_id' }
  )

  if (roleInsertError) {
    return jsonResponse(
      {
        ok: false,
        message: roleInsertError.message || 'Usuario creado, pero no se pudo asignar rol de aplicacion',
      },
      500
    )
  }

  return jsonResponse({
    ok: true,
    message:
      'Usuario creado y confirmado. Puede iniciar sesion con la contraseña inicial configurada por el administrador.',
    email,
    user_id: invitedUserId,
  })
})
