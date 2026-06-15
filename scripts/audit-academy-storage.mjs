/**
 * Audita el bucket `academia` vs el catálogo de módulos base.
 * Requiere SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en .env
 *
 * Uso: node scripts/audit-academy-storage.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(path.join(root, '.env'))
loadEnvFile(path.join(root, '.env.local'))

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const CATALOG = {
  1: 'Modulo_1_Diagnostico.pdf',
  2: 'Modulo_2_Vision_Proceso_Objetivo.pdf',
  3: 'Modulo_3_Analisis_Brechas.pdf',
  4: 'Modulo_4_KPIs_OKRs.pdf',
  5: 'Modulo_5_RACI_Lean.pdf',
  6: 'Modulo_6_Metodologia_Agil.pdf',
  7: 'Modulo_7_User_Stories_Backlog.pdf',
  8: 'Modulo_8_Roadmap_Ejecucion.pdf',
}

const supabase = createClient(url, serviceKey)

async function listAllPdfPaths(prefix = '') {
  const paths = []
  const { data, error } = await supabase.storage.from('academia').list(prefix, { limit: 500 })
  if (error) throw error

  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.name.toLowerCase().endsWith('.pdf')) {
      paths.push(fullPath)
      continue
    }
    if (item.id == null) {
      paths.push(...(await listAllPdfPaths(fullPath)))
    }
  }
  return paths
}

function parseModuleId(filePath) {
  const base = filePath.split('/').pop() ?? filePath
  const match = /^Modulo_(\d+)_/i.exec(base)
  return match ? Number(match[1]) : null
}

const paths = await listAllPdfPaths()
console.log(`\nBucket academia — ${paths.length} PDF(s):\n`)
for (const p of paths.sort()) {
  console.log(`  - ${p}`)
}

console.log('\nAlineación módulo ↔ PDF:\n')
for (const [id, expected] of Object.entries(CATALOG)) {
  const moduleId = Number(id)
  const exact = paths.filter((p) => (p.split('/').pop() ?? p) === expected)
  const byId = paths.filter((p) => parseModuleId(p) === moduleId)
  const status = exact.length ? 'OK (nombre exacto)' : byId.length ? 'REVISAR (otro nombre)' : 'FALTA'
  console.log(`  Módulo ${id}: ${status}`)
  console.log(`    Esperado: ${expected}`)
  if (exact.length) console.log(`    En bucket: ${exact.join(', ')}`)
  else if (byId.length) console.log(`    Candidatos: ${byId.join(', ')}`)
  console.log('')
}
