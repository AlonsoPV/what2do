/**
 * Establece la contraseña de un usuario de Supabase Auth (solo uso puntual/admin).
 * Requiere SUPABASE_SERVICE_ROLE_KEY (no exponer en frontend).
 *
 * Uso: node scripts/set-user-password.mjs <user_id> <nueva_contraseña>
 * Ejemplo: node scripts/set-user-password.mjs 38e5276b-92f4-4c5f-b420-ba20e83e67c7 envialo_mexico26
 *
 * Variables en .env: SUPABASE_URL (recomendado) o VITE_SUPABASE_URL, y SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { loadDotenv } from './_load-dotenv.mjs'

const envLoadedFrom = loadDotenv(import.meta.url)

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.argv[2]
const password = process.argv[3]

if (!url || !serviceRoleKey) {
  if (!envLoadedFrom) {
    console.error('No se encontró .env en la raíz del proyecto.')
  }
  console.error('Faltan variables de entorno. En .env:')
  console.error('  SUPABASE_URL=https://xxx.supabase.co   (o VITE_SUPABASE_URL con la misma URL)')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... (service_role; solo scripts locales, nunca VITE_* ni Supabase secrets con nombre VITE_)')
  console.error(`\nComprobación: URL=${Boolean(url)}  service_role=${Boolean(serviceRoleKey)}`)
  process.exit(1)
}

if (!userId || !password) {
  console.error('Uso: node scripts/set-user-password.mjs <user_id> <nueva_contraseña>')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data, error } = await supabase.auth.admin.updateUserById(userId, { password })

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log('Contraseña actualizada correctamente para el usuario', userId)
