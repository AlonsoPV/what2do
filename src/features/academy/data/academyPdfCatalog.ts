/**
 * Catálogo canónico: cada módulo base (1–8) debe usar exactamente este archivo PDF.
 * Fuente única para evitar desalineación entre módulo y documento.
 */
export const ACADEMY_BASE_MODULE_PDF_NAMES: Record<number, string> = {
  1: 'Modulo_1_Diagnostico.pdf',
  2: 'Modulo_2_Vision_Proceso_Objetivo.pdf',
  3: 'Modulo_3_Analisis_Brechas.pdf',
  4: 'Modulo_4_KPIs_OKRs.pdf',
  5: 'Modulo_5_RACI_Lean.pdf',
  6: 'Modulo_6_Metodologia_Agil.pdf',
  7: 'Modulo_7_User_Stories_Backlog.pdf',
  8: 'Modulo_8_Roadmap_Ejecucion.pdf',
}

export const ACADEMY_BASE_MODULE_IDS = Object.keys(ACADEMY_BASE_MODULE_PDF_NAMES)
  .map(Number)
  .sort((a, b) => a - b)

export function getAcademyBaseModulePdfName(moduleId: number): string {
  const pdfName = ACADEMY_BASE_MODULE_PDF_NAMES[moduleId]
  if (!pdfName) {
    throw new Error(`No hay PDF catalogado para el módulo base ${moduleId}.`)
  }
  return pdfName
}

export function isAcademyBaseModule(moduleId: number): boolean {
  return moduleId in ACADEMY_BASE_MODULE_PDF_NAMES
}

/** Valida que el pdfName de un módulo base coincida con el catálogo. */
export function assertAcademyBaseModulePdfName(moduleId: number, pdfName: string): void {
  if (!isAcademyBaseModule(moduleId)) return
  const expected = getAcademyBaseModulePdfName(moduleId)
  if (pdfName !== expected) {
    throw new Error(
      `El módulo ${moduleId} debe usar "${expected}", pero tiene "${pdfName}".`
    )
  }
}

/** Extrae el número de módulo del nombre de archivo estándar `Modulo_N_...pdf`. */
export function parseAcademyModuleIdFromPdfName(pdfName: string): number | null {
  const base = pdfName.split('/').pop() ?? pdfName
  const match = /^Modulo_(\d+)_/i.exec(base)
  if (!match) return null
  const id = Number(match[1])
  return Number.isInteger(id) && id > 0 ? id : null
}
