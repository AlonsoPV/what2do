#!/usr/bin/env node
/**
 * Genera un archivo .ics (iCalendar) con eventos de día completo del 1 al 5 de abril de 2026
 * marcados como "Sin clases", para importar en Google Calendar, Outlook, Apple Calendar, etc.
 *
 * Uso:
 *   node scripts/generate-sin-clases-abril-2026.mjs
 *   node scripts/generate-sin-clases-abril-2026.mjs --out ./sin-clases-abril-2026.ics
 *
 * Nota: Google Classroom, Teams u otros LMS no tienen en este repo una API de "apagar clases";
 * suele hacerse con calendario institucional, publicación en el curso o automatización propia (Apps Script).
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATES = [
  { start: '20260401', end: '20260402', label: 'Sin clases (1 abr 2026)' },
  { start: '20260402', end: '20260403', label: 'Sin clases (2 abr 2026)' },
  { start: '20260403', end: '20260404', label: 'Sin clases (3 abr 2026)' },
  { start: '20260404', end: '20260405', label: 'Sin clases (4 abr 2026)' },
  { start: '20260405', end: '20260406', label: 'Sin clases (5 abr 2026)' },
]

function escapeIcsText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function buildIcs() {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tablero-operativo//sin-clases//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sin clases abril 2026',
  ]

  const stamp = '20260401T120000Z'
  let seq = 0
  for (const d of DATES) {
    seq += 1
    const uid = `sin-clases-2026-${d.start}@tablero-operativo.local`
    const desc = escapeIcsText(
      'Día sin clases programado. Revisa tu LMS (Classroom, Teams, Moodle) para pausar o reprogramar actividades.'
    )
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d.start}`,
      `DTEND;VALUE=DATE:${d.end}`,
      `SUMMARY:${escapeIcsText(d.label)}`,
      `DESCRIPTION:${desc}`,
      `SEQUENCE:${seq}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

const args = process.argv.slice(2)
let outPath = resolve(__dirname, 'sin-clases-2026-04-01-a-05.ics')
const outIdx = args.indexOf('--out')
if (outIdx !== -1 && args[outIdx + 1]) {
  outPath = resolve(process.cwd(), args[outIdx + 1])
}

const ics = buildIcs()
writeFileSync(outPath, ics, 'utf8')
console.log(`Archivo generado: ${outPath}`)
console.log('Importa el .ics en tu calendario y, si aplica, bloquea esos días en Classroom/Teams con las reglas de tu centro.')
