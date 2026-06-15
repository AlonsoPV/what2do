/**
 * Genera PDFs válidos mínimos en public/docs/ para los 8 módulos base.
 * Sustituye placeholders de texto que el navegador no puede abrir como PDF.
 *
 * Uso: node scripts/generate-academy-module-pdfs.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const docsDir = path.join(root, 'public', 'docs')

const MODULES = [
  { id: 1, pdfName: 'Modulo_1_Diagnostico.pdf', title: 'Diagnostico del Proceso Actual', subtitle: 'BPMN AS-IS: Order-to-Cash' },
  { id: 2, pdfName: 'Modulo_2_Vision_Proceso_Objetivo.pdf', title: 'Vision del Proceso Objetivo', subtitle: 'BPMN TO-BE: El Futuro Digitalizado' },
  { id: 3, pdfName: 'Modulo_3_Analisis_Brechas.pdf', title: 'Analisis de Brechas', subtitle: 'Los 18 Gaps entre el AS-IS y TO-BE' },
  { id: 4, pdfName: 'Modulo_4_KPIs_OKRs.pdf', title: 'KPIs y OKRs Estrategicos', subtitle: 'Metricas para Medir el Exito' },
  { id: 5, pdfName: 'Modulo_5_RACI_Lean.pdf', title: 'Matriz RACI y Estructura Lean', subtitle: 'Quien Hace Que - Roles Claros' },
  { id: 6, pdfName: 'Modulo_6_Metodologia_Agil.pdf', title: 'Metodologia Agil Aplicada', subtitle: 'Scrum Adaptado a Logistica Farmaceutica' },
  { id: 7, pdfName: 'Modulo_7_User_Stories_Backlog.pdf', title: 'User Stories y Backlog', subtitle: '46 Historias de Usuario Detalladas' },
  { id: 8, pdfName: 'Modulo_8_Roadmap_Ejecucion.pdf', title: 'Roadmap y Ejecucion', subtitle: 'Plan de 18 Meses - Arrancamos' },
]

function escapePdfText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildMinimalPdf(lines) {
  const contentLines = lines.map((line, index) => {
    const y = 780 - index * 22
    const safe = escapePdfText(line)
    return `BT /F1 12 Tf 56 ${y} Td (${safe}) Tj ET`
  })

  const stream = `${contentLines.join('\n')}\n`
  const streamLength = Buffer.byteLength(stream, 'latin1')

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}endstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += obj
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`
  return pdf
}

fs.mkdirSync(docsDir, { recursive: true })

for (const mod of MODULES) {
  const pdf = buildMinimalPdf([
    `Academia O2C - Modulo ${mod.id}`,
    mod.title,
    mod.subtitle,
    '',
    'Material de referencia del modulo.',
    'Sustituir este archivo por el PDF definitivo cuando este disponible.',
  ])
  const target = path.join(docsDir, mod.pdfName)
  fs.writeFileSync(target, pdf, 'latin1')
  console.log(`OK ${mod.pdfName} (${Buffer.byteLength(pdf)} bytes)`)
}

console.log(`Generados ${MODULES.length} PDFs en public/docs/`)
