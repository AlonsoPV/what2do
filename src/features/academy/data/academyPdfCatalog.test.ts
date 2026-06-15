import { describe, expect, it } from 'vitest'
import { ACADEMY_MODULES } from './modules'
import {
  ACADEMY_BASE_MODULE_IDS,
  ACADEMY_BASE_MODULE_PDF_NAMES,
  assertAcademyBaseModulePdfName,
  parseAcademyModuleIdFromPdfName,
} from './academyPdfCatalog'

describe('academyPdfCatalog', () => {
  it('alinea cada módulo base con su PDF catalogado', () => {
    for (const module of ACADEMY_MODULES) {
      if (!ACADEMY_BASE_MODULE_IDS.includes(module.id)) continue
      expect(() => assertAcademyBaseModulePdfName(module.id, module.pdfName)).not.toThrow()
      expect(parseAcademyModuleIdFromPdfName(module.pdfName)).toBe(module.id)
    }
  })

  it('tiene un PDF único por módulo base', () => {
    const names = Object.values(ACADEMY_BASE_MODULE_PDF_NAMES)
    expect(new Set(names).size).toBe(names.length)
  })
})
