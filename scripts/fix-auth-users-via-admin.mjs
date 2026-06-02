/**
 * Repara login "Database error querying schema" (tokens NULL en auth.users).
 *
 * 1) Llama RPC fix_auth_user_tokens_by_email (migración 20260601180000) — no usa listUsers.
 * 2) Si el RPC no existe aún, intenta delete + createUser (requiere listUsers; puede fallar).
 *
 * Requiere en .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Aplicar migración antes: npx supabase db push  (o SQL Editor con la migración RPC)
 *
 * Uso:
 *   npm run auth:fix-users -- jorgegonzalez@emx.mx
 *   npm run auth:fix-users -- --all-emx-batch
 *   node scripts/fix-auth-users-via-admin.mjs jorgegonzalez@emx.mx --insecure-tls
 */

import { loadDotenv } from './_load-dotenv.mjs'
import { configureNodeTls, TLS_HELP } from './_configure-node-tls.mjs'

loadDotenv(import.meta.url)

const argv = process.argv.slice(2)
configureNodeTls(argv)

const { createClient } = await import('@supabase/supabase-js')

const DEFAULT_PASSWORD = 'emx@2026'

const EMX_BATCH_EMAILS = [
  'irhec@emx.mx',
  'hector@emx.mx',
  'itzel@emx.mx',
  'nubia@emx.mx',
  'damaris@emx.mx',
  'leslie@emx.mx',
  'nancyrojo@emx.mx',
  'gerardopuga@emx.mx',
  'nora@emx.mx',
  'rebeca@emx.mx',
  'erick@emx.mx',
  'jorgegonzalez@emx.mx',
]

const dryRun = argv.includes('--dry-run')
const allBatch = argv.includes('--all-emx-batch')
const passwordArg = argv.find((a) => a.startsWith('--password='))
const password = passwordArg ? passwordArg.slice('--password='.length) : DEFAULT_PASSWORD

const emails = allBatch
  ? EMX_BATCH_EMAILS
  : argv.filter((a) => !a.startsWith('--') && a.includes('@')).map((e) => e.toLowerCase().trim())

if (emails.length === 0) {
  console.error('Indica al menos un correo o usa --all-emx-batch')
  process.exit(1)
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let rpcAvailable = null

async function checkRpc() {
  if (rpcAvailable !== null) return rpcAvailable
  const { error } = await supabase.rpc('fix_auth_user_tokens_by_email', {
    p_email: '__rpc_probe__@invalid.local',
  })
  if (!error) {
    rpcAvailable = true
    return true
  }
  const msg = error.message ?? ''
  if (msg.includes('Could not find the function') || msg.includes('schema cache')) {
    rpcAvailable = false
    return false
  }
  rpcAvailable = true
  return true
}

async function fixViaRpc(email) {
  const { data: userId, error } = await supabase.rpc('fix_auth_user_tokens_by_email', {
    p_email: email,
  })
  if (error) throw new Error(`RPC: ${error.message}`)
  if (!userId) throw new Error('No existe usuario Auth con ese correo')
  return userId
}

async function loadProfile(userId) {
  const { data: usuario, error: uErr } = await supabase
    .from('usuarios')
    .select('nombre, rol, area, activo, onboarding_completed')
    .eq('user_id', userId)
    .maybeSingle()
  if (uErr) throw new Error(`usuarios: ${uErr.message}`)

  const { data: appRoleRow, error: rErr } = await supabase
    .from('user_roles')
    .select('app_role')
    .eq('user_id', userId)
    .maybeSingle()
  if (rErr) throw new Error(`user_roles: ${rErr.message}`)

  return {
    usuario: usuario ?? {
      nombre: email.split('@')[0],
      rol: 'Analista',
      area: null,
      activo: true,
      onboarding_completed: true,
    },
    app_role: appRoleRow?.app_role ?? 'viewer',
  }
}

async function syncPasswordAndProfile(userId, email, snapshot) {
  const meta = {
    nombre: snapshot.usuario.nombre,
    rol: snapshot.usuario.rol,
    area: snapshot.usuario.area ?? undefined,
    activo: snapshot.usuario.activo,
    onboarding_completed: snapshot.usuario.onboarding_completed,
  }

  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (authErr) throw new Error(`updateUser: ${authErr.message}`)

  const { error: roleErr } = await supabase.from('user_roles').upsert(
    { user_id: userId, app_role: snapshot.app_role },
    { onConflict: 'user_id' }
  )
  if (roleErr) throw new Error(`user_roles: ${roleErr.message}`)

  const { error: perfilErr } = await supabase.from('usuarios').upsert(
    {
      user_id: userId,
      nombre: meta.nombre,
      rol: meta.rol,
      area: meta.area ?? null,
      activo: meta.activo,
      onboarding_completed: meta.onboarding_completed,
    },
    { onConflict: 'user_id' }
  )
  if (perfilErr) throw new Error(`usuarios: ${perfilErr.message}`)
}

async function repairEmail(email) {
  if (dryRun) {
    console.log(`[dry-run] ${email}`)
    return
  }

  const hasRpc = await checkRpc()
  if (!hasRpc) {
    throw new Error(
      'Falta la migración fix_auth_user_tokens_rpc. Aplícala en Supabase (db push o SQL Editor) y vuelve a ejecutar.'
    )
  }

  const userId = await fixViaRpc(email)
  const snapshot = await loadProfile(userId)
  await syncPasswordAndProfile(userId, email, snapshot)
  console.log(`[OK] ${email} (id ${userId}) — tokens corregidos, contraseña ${password}`)
}

function isTlsFetchError(err) {
  const msg = err instanceof Error ? err.message : String(err)
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : ''
  return (
    msg.includes('fetch failed') ||
    cause.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
    cause.includes('unable to verify the first certificate')
  )
}

async function main() {
  console.log('Reparar Auth (RPC + actualizar contraseña/perfil)\n')

  if (!(await checkRpc())) {
    console.error(
      'No está desplegada la función fix_auth_user_tokens_by_email.\n' +
        'Aplica supabase/migrations/20260601180000_fix_auth_user_tokens_rpc.sql en el proyecto remoto.'
    )
    process.exit(1)
  }

  let ok = 0
  let failed = 0
  let tlsHintShown = false

  for (const email of emails) {
    try {
      await repairEmail(email)
      ok += 1
    } catch (err) {
      failed += 1
      console.error(`[ERROR] ${email}: ${err instanceof Error ? err.message : err}`)
      if (!tlsHintShown && isTlsFetchError(err)) {
        tlsHintShown = true
        console.error(`\n${TLS_HELP}\n`)
      }
    }
  }

  console.log(`\nListo: ${ok} OK, ${failed} error(es)`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  if (isTlsFetchError(err)) console.error(`\n${TLS_HELP}\n`)
  process.exit(1)
})
