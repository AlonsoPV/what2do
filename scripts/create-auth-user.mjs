/**
 * Crea un usuario en Supabase Auth (solo uso puntual/admin).
 * Requiere SUPABASE_SERVICE_ROLE_KEY (no exponer en frontend).
 *
 * Uso (PowerShell):
 *   $env:CREATE_USER_EMAIL='correo@ejemplo.com'; $env:CREATE_USER_PASSWORD='tu_contraseña'; node scripts/create-auth-user.mjs
 *
 * Uso (bash):
 *   CREATE_USER_EMAIL=correo@ejemplo.com CREATE_USER_PASSWORD=tu_contraseña node scripts/create-auth-user.mjs
 *
 * Variables en .env local (NO son secretos de Edge ni Vite embebidos en el navegador):
 *   SUPABASE_URL (recomendado; misma URL que VITE_SUPABASE_URL) o VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (Dashboard → API → service_role)
 */

import { createClient } from '@supabase/supabase-js'
import { loadDotenv } from './_load-dotenv.mjs'

loadDotenv(import.meta.url)

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = (process.env.CREATE_USER_EMAIL || '').trim().toLowerCase()
const password = process.env.CREATE_USER_PASSWORD || ''

if (!url || !serviceRoleKey) {
  console.error('Faltan variables de entorno. En .env (local, solo scripts — no Supabase Secrets con prefijo VITE_):')
  console.error('  SUPABASE_URL=https://xxx.supabase.co   (o VITE_SUPABASE_URL con la misma URL)')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ... (desde Supabase → Settings → API → service_role; nunca en frontend)')
  process.exit(1)
}

if (!email || !password) {
  console.error('Faltan CREATE_USER_EMAIL o CREATE_USER_PASSWORD.')
  console.error('Ejemplo (PowerShell): $env:CREATE_USER_EMAIL=\'a@b.com\'; $env:CREATE_USER_PASSWORD=\'secret\'; node scripts/create-auth-user.mjs')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (error) {
  console.error('Error:', error.message)
  if (error.message.includes('already been registered')) {
    console.error('El usuario ya existe. Usa scripts/set-user-password.mjs para cambiar la contraseña.')
  }
  process.exit(1)
}

console.log('Usuario creado correctamente:', data.user?.email ?? email, '(id:', data.user?.id ?? '—', ')')
console.log('El usuario ya puede iniciar sesión con ese correo y contraseña.')
