import { describe, expect, it } from 'vitest'
import {
  EVIDENCIA_MAX_SIZE_MB,
  getEvidenciaAcceptedAccept,
  isAcceptedEvidenciaFile,
  resolveEvidenciaContentType,
} from './evidenciaFileTypes'

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

describe('evidenciaFileTypes', () => {
  it('acepta PDF, imágenes, CSV y Excel', () => {
    expect(isAcceptedEvidenciaFile(makeFile('doc.pdf', 'application/pdf'))).toBe(true)
    expect(isAcceptedEvidenciaFile(makeFile('foto.png', 'image/png'))).toBe(true)
    expect(isAcceptedEvidenciaFile(makeFile('foto.jpg', 'image/jpeg'))).toBe(true)
    expect(isAcceptedEvidenciaFile(makeFile('datos.csv', 'text/csv'))).toBe(true)
    expect(
      isAcceptedEvidenciaFile(
        makeFile('reporte.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      )
    ).toBe(true)
    expect(isAcceptedEvidenciaFile(makeFile('legacy.xls', 'application/vnd.ms-excel'))).toBe(true)
  })

  it('acepta CSV aunque el navegador no envíe MIME', () => {
    expect(isAcceptedEvidenciaFile(makeFile('datos.csv', ''))).toBe(true)
    expect(isAcceptedEvidenciaFile(makeFile('datos.csv', 'application/octet-stream'))).toBe(true)
    expect(isAcceptedEvidenciaFile(makeFile('datos.csv', 'text/plain'))).toBe(true)
  })

  it('rechaza tipos no permitidos y archivos muy grandes', () => {
    expect(isAcceptedEvidenciaFile(makeFile('archivo.zip', 'application/zip'))).toBe(false)
    expect(isAcceptedEvidenciaFile(makeFile('script.exe', 'application/octet-stream'))).toBe(false)
    expect(
      isAcceptedEvidenciaFile(
        makeFile('grande.pdf', 'application/pdf', (EVIDENCIA_MAX_SIZE_MB + 1) * 1024 * 1024)
      )
    ).toBe(false)
  })

  it('normaliza content-type por extensión para Storage', () => {
    expect(resolveEvidenciaContentType(makeFile('datos.csv', 'text/plain'))).toBe('text/csv')
    expect(resolveEvidenciaContentType(makeFile('reporte.xlsx', ''))).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  })

  it('incluye csv y excel en accept del input', () => {
    const accept = getEvidenciaAcceptedAccept()
    expect(accept).toContain('.csv')
    expect(accept).toContain('.xlsx')
    expect(accept).toContain('text/csv')
  })
})
