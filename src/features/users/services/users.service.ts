/**
 * Servicio de administración de usuarios (tabla usuarios).
 * Gestiona perfiles; no maneja contraseñas (auth.users).
 *
 * Alta: `create` → Edge Function `invite-user` (service role) → `auth.admin.createUser`
 * + trigger `handle_new_user` → fila en `public.usuarios`. Contraseñas solo en Supabase Auth.
 */

import { supabase } from '@/lib/supabase/client'
import type { UserProfile, CreateUserInput, UpdateUserInput, UsersFilter } from '../types/user.types'

const TABLE = 'usuarios'

type InviteUserResponseBody = { ok?: boolean; message?: string; profile?: UserProfile | null }

function isUnauthorizedListError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  const message = e.message?.toLowerCase() ?? ''
  return e.code === '42501' || message.includes('no autorizado') || message.includes('permission denied')
}

function applyUserFilters(list: UserProfile[], filter: UsersFilter): UserProfile[] {
  let next = list

  if (filter.rol != null && filter.rol !== '') {
    next = next.filter((u) => u.rol === filter.rol)
  }
  if (filter.area != null && filter.area !== '') {
    next = next.filter((u) => u.area === filter.area)
  }
  if (filter.activo !== undefined && filter.activo !== null) {
    next = next.filter((u) => u.activo === filter.activo)
  }

  if (filter.search?.trim()) {
    const term = filter.search.trim().toLowerCase()
    next = next.filter(
      (u) =>
        u.nombre.toLowerCase().includes(term) ||
        (u.email?.toLowerCase().includes(term) ?? false) ||
        (u.area?.toLowerCase().includes(term) ?? false)
    )
  }

  return next
}

async function listVisibleUsersCatalog(filter: UsersFilter): Promise<UserProfile[]> {
  let query = supabase
    .from(TABLE)
    .select('id,user_id,nombre,rol,area,activo,created_at,updated_at')
    .order('nombre', { ascending: true })

  if (filter.activo !== undefined && filter.activo !== null) {
    query = query.eq('activo', filter.activo)
  }

  const { data, error } = await query
  if (error) throw error

  return applyUserFilters(
    ((data ?? []) as Omit<UserProfile, 'email'>[]).map((u) => ({ ...u, email: null })),
    { ...filter, activo: null }
  )
}

/** Mensajes del API (a veces en inglés) → texto claro para quien administra usuarios. */
function mapInviteUserFacingMessage(raw: string): string {
  const m = raw.trim()
  const low = m.toLowerCase()
  if (/already|exists|registered/i.test(low) && (low.includes('user') || low.includes('email'))) {
    return 'Ese correo ya tiene cuenta. Revisa el listado de usuarios o usa otro correo.'
  }
  if (low.includes('invalid') && low.includes('email')) {
    return 'El correo no es válido. Revísalo e inténtalo de nuevo.'
  }
  if (m === 'No autorizado' || m === 'Sesión inválida') {
    return 'Tu sesión caducó o no tienes permiso. Vuelve a iniciar sesión e inténtalo de nuevo.'
  }
  if (m === 'Solo administradores pueden invitar usuarios') {
    return 'Solo quienes administran la plataforma pueden enviar invitaciones.'
  }
  if (m === 'No se pudo validar permisos' || m === 'Faltan credenciales de Supabase') {
    return 'No pudimos completar la invitación por un fallo del servidor. Inténtalo más tarde o avisa a quien administra el sistema.'
  }
  if (m === 'Correo, nombre y rol son obligatorios') {
    return 'Faltan correo, nombre o rol.'
  }
  return m
}

async function parseInviteFunctionError(
  error: Error,
  data: InviteUserResponseBody | null
): Promise<string> {
  if (data && typeof data.message === 'string' && data.message.trim()) {
    return mapInviteUserFacingMessage(data.message)
  }
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body: unknown = await ctx.json()
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: string }).message === 'string') {
        return mapInviteUserFacingMessage((body as { message: string }).message)
      }
    } catch {
      /* ignore */
    }
  }
  return mapInviteUserFacingMessage(error.message || 'No pudimos enviar la invitación')
}

export const usersAdminService = {
  /**
   * Lista usuarios con filtros. Requiere RLS que permita a admins ver todos.
   * Paginación: por ahora devuelve todos; estructura lista para limit/offset después.
   */
  async list(filter: UsersFilter = {}): Promise<UserProfile[]> {
    const { data, error } = await supabase.rpc('settings_users_list')
    if (error) {
      if (isUnauthorizedListError(error)) {
        return listVisibleUsersCatalog(filter)
      }
      throw error
    }

    return applyUserFilters((data ?? []) as UserProfile[], filter)
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as UserProfile | null
  },

  /** Obtiene el email de auth.users para un user_id. Requiere ser el propio usuario o admin. */
  async getAuthEmail(userId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_auth_user_email', {
      p_user_id: userId,
    })
    if (error) return null
    return (data as string) ?? null
  },

  async update(id: string, input: UpdateUserInput): Promise<UserProfile> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.nombre !== undefined) {
      payload.nombre = input.nombre.trim()
    }
    if (input.rol !== undefined) {
      payload.rol = input.rol
    }
    if (input.area !== undefined) {
      payload.area = input.area?.trim() ?? null
    }
    if (input.activo !== undefined) {
      payload.activo = input.activo
    }
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as UserProfile
  },

  /**
   * Alterna activo. Soft business logic: no borrar, solo desactivar.
   */
  async setActivo(id: string, activo: boolean): Promise<UserProfile> {
    return this.update(id, { activo })
  },

  /**
   * Envía una invitación por correo. La Edge Function crea el usuario en Auth
   * y el trigger de Supabase sincroniza el perfil en public.usuarios.
   */
  async create(input: CreateUserInput): Promise<UserProfile | null> {
    const payload = {
      email: input.email.trim().toLowerCase(),
      nombre: input.nombre.trim(),
      rol: input.rol,
      area: input.area?.trim() ?? null,
      activo: input.activo ?? true,
    }

    const { data, error } = await supabase.functions.invoke<InviteUserResponseBody>('invite-user', {
      body: payload,
    })

    if (error) {
      throw new Error(await parseInviteFunctionError(error, data ?? null))
    }
    if (data && data.ok === false && typeof data.message === 'string') {
      throw new Error(mapInviteUserFacingMessage(data.message))
    }
    return data?.profile ?? null
  },
}
