/**
 * Establece la misma contraseña en varios usuarios de Supabase Auth (admin).
 * Requiere SUPABASE_SERVICE_ROLE_KEY (no subir a git ni usar en frontend).
 *
 * IDs a actualizar (Auth user id):
 */
const USER_IDS = [
  '5262608e-7b8e-4d1a-83aa-2ef819e8e50e',
  'c00b1975-4f8f-4fc3-b228-005aa9e5374f',
  'dd764c9f-8145-45d4-9111-0a8ec7f687e5',
]

/**
 * Uso:
 *   node scripts/set-users-password-batch.mjs emx@2026
 *   NEW_PASSWORD=emx@2026 node scripts/set-users-password-batch.mjs
 *
 * Variables (.env en la raíz): VITE_SUPABASE_URL o SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.argv[2] || process.env.NEW_PASSWORD

if (!url || !serviceRoleKey) {
  console.error('Faltan variables de entorno. En .env:')
  console.error('  VITE_SUPABASE_URL=https://xxx.supabase.co')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ... (Supabase → Settings → API → service_role)')
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
