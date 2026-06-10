export const EVIDENCIA_MAX_SIZE_MB = 10

export const EVIDENCIA_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
}

export const EVIDENCIA_ACCEPTED_EXTENSIONS = Object.keys(EXTENSION_TO_MIME).map((ext) => `.${ext}`)

export const EVIDENCIA_ACCEPTED_FORMATS_LABEL = 'PDF, PNG, JPG, CSV o Excel (máx. 10 MB)'

export const EVIDENCIA_ACCEPTED_FORMATS_SHORT = 'PDF, PNG, JPG, CSV o Excel'

export function getFileExtension(name: string): string | null {
  const trimmed = name.trim()
  const lastDot = trimmed.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return null
  return trimmed.slice(lastDot + 1).toLowerCase()
}

/** MIME estable para Storage: prioriza extensión (CSV suele venir como text/plain u octet-stream). */
export function resolveEvidenciaContentType(file: File): string {
  const ext = getFileExtension(file.name)
  if (ext && EXTENSION_TO_MIME[ext]) return EXTENSION_TO_MIME[ext]
  if (file.type && file.type !== 'application/octet-stream') return file.type
  return file.type || 'application/octet-stream'
}

export function isAcceptedEvidenciaFile(file: File): boolean {
  if (file.size > EVIDENCIA_MAX_SIZE_MB * 1024 * 1024) return false

  const ext = getFileExtension(file.name)
  if (ext && ext in EXTENSION_TO_MIME) return true

  return EVIDENCIA_ACCEPTED_MIME_TYPES.includes(
    file.type as (typeof EVIDENCIA_ACCEPTED_MIME_TYPES)[number]
  )
}

export function getEvidenciaAcceptedAccept(): string {
  return [...EVIDENCIA_ACCEPTED_EXTENSIONS, ...EVIDENCIA_ACCEPTED_MIME_TYPES].join(',')
}

export const EVIDENCIA_REJECTED_MESSAGE = `Solo se permiten ${EVIDENCIA_ACCEPTED_FORMATS_LABEL.toLowerCase()}`
