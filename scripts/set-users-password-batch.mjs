/**
 * Establece la misma contraseña en varios usuarios de Supabase Auth (admin).
 * Requiere SUPABASE_SERVICE_ROLE_KEY (no subir a git ni usar en frontend).
 *
 * Edita USER_IDS abajo con los UUID de Auth (Dashboard → Authentication → Users).
 *
 * Variables en .env en la raíz del proyecto (scripts locales, no Edge Secrets con VITE_):
 *   SUPABASE_URL=https://xxx.supabase.co   (o VITE_SUPABASE_URL con la misma URL)
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (service_role, no anon)
 */
const USER_IDS = [
  '83a033bd-e273-4314-8c9a-6a6bd8f4400e',
  '38e5276b-92f4-4c5f-b420-ba20e83e67c7',
  '1b332244-6171-4941-9373-735bac497eec',
]

/**
 * Uso (desde la raíz del repo):
 *   node scripts/set-users-password-batch.mjs "emx@2026"
 *   npm run auth:password-batch -- "emx@2026"
 *
 * PowerShell (contraseña por variable):
 *   $env:NEW_PASSWORD="emx@2026"; node scripts/set-users-password-batch.mjs
 *
 * El .env debe tener SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { loadDotenv } from './_load-dotenv.mjs'

const envLoadedFrom = loadDotenv(import.meta.url)

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.argv[2] || process.env.NEW_PASSWORD

if (!url || !serviceRoleKey) {
  if (!envLoadedFrom) {
    console.error('No se encontró archivo .env en la carpeta del proyecto ni en el directorio actual.')
  }
  console.error('Faltan variables de entorno. En .env (sin comillas rotas, una variable por línea):')
  console.error('  SUPABASE_URL=https://xxx.supabase.co   (o VITE_SUPABASE_URL con la misma URL)')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... (Settings → API → service_role; no uses la anon key; no configures esto como variable VITE_)')
  console.error(`\nComprobación: URL=${Boolean(url)}  service_role=${Boolean(serviceRoleKey)}`)
  console.error('Ejecuta el comando desde la raíz del repo: cd ...\\tablero-operativo')
  process.exit(1)
}

if (!password) {
  console.error('Indica la contraseña nueva:')
  console.error('  node scripts/set-users-password-batch.mjs "<contraseña>"')
  console.error('  o: NEW_PASSWORD="..." node scripts/set-users-password-batch.mjs')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let ok = 0
for (const userId of USER_IDS) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, { password })
  if (error) {
    console.error(`[ERROR] ${userId}: ${error.message}`)
  } else {
    console.log(`[OK]    ${userId}${data?.user?.email ? ` (${data.user.email})` : ''}`)
    ok += 1
  }
}

console.log(`\nListo: ${ok}/${USER_IDS.length} usuarios actualizados.`)
if (ok < USER_IDS.length) process.exit(1)
