/**
 * PDFs de Academia O2C en Storage (bucket `academia`).
 * Fuente principal: Supabase Storage. Fallback local: /public/docs (desarrollo).
 */

import { supabase } from '@/lib/supabase/client'
import {
  getAcademyBaseModulePdfName,
  isAcademyBaseModule,
  parseAcademyModuleIdFromPdfName,
} from '@/features/academy/data/academyPdfCatalog'

export const ACADEMY_STORAGE_BUCKET = 'academia'
const MAX_PDF_BYTES = 50 * 1024 * 1024

const pathCache = new Map<string, string>()

export function isAcademyPdfFile(file: File): boolean {
  return file.type === 'application/pdf' && file.size <= MAX_PDF_BYTES
}

export function clearAcademyPdfPathCache(moduleId?: number, pdfName?: string): void {
  if (moduleId != null && pdfName) {
    pathCache.delete(`${moduleId}:${pdfName}`)
    return
  }
  pathCache.clear()
}

function cacheKey(moduleId: number, pdfName: string): string {
  return `${moduleId}:${pdfName}`
}

function resolveEffectivePdfName(pdfName: string, moduleId: number): string {
  if (isAcademyBaseModule(moduleId)) {
    return getAcademyBaseModulePdfName(moduleId)
  }
  return pdfName
}

function buildPathCandidates(pdfName: string, moduleId: number): string[] {
  const modulePrefix = `Modulo_${moduleId}`
  const canonicalPdfName = resolveEffectivePdfName(pdfName, moduleId)

  return [
    canonicalPdfName,
    pdfName,
    `modulos/${canonicalPdfName}`,
    `modulos/${pdfName}`,
    `pdfs/${canonicalPdfName}`,
    `pdfs/${pdfName}`,
    `${modulePrefix}/${canonicalPdfName}`,
    `${modulePrefix}/${pdfName}`,
    `modulo-${moduleId}/${canonicalPdfName}`,
    `modulo-${moduleId}/${pdfName}`,
    `${modulePrefix}.pdf`,
    `modulos/${modulePrefix}.pdf`,
  ]
}

function isPdfContentType(contentType: string | null): boolean {
  if (!contentType) return false
  const normalized = contentType.toLowerCase()
  return normalized.includes('application/pdf') || normalized.includes('application/octet-stream')
}

function hasPdfMagicHeader(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false
  const header = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 5)))
  return header.startsWith('%PDF-')
}

async function resolveLocalAcademyPdfUrl(pdfName: string): Promise<string | null> {
  const localHref = `/docs/${encodeURIComponent(pdfName)}`
  try {
    const res = await fetch(localHref, {
      method: 'GET',
      headers: { Range: 'bytes=0-4' },
    })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type')
    if (contentType?.includes('text/html')) return null

    const buffer = await res.arrayBuffer()
    if (!hasPdfMagicHeader(buffer)) return null
    if (contentType && !isPdfContentType(contentType)) return null

    return localHref
  } catch {
    return null
  }
}

async function signedUrlForPath(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ACADEMY_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

async function listAcademyPdfPaths(prefix = ''): Promise<string[]> {
  const paths: string[] = []

  const { data: rootItems, error: rootError } = await supabase.storage
    .from(ACADEMY_STORAGE_BUCKET)
    .list(prefix, { limit: 500 })

  if (rootError) return paths

  for (const item of rootItems ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name

    if (item.name.toLowerCase().endsWith('.pdf')) {
      paths.push(fullPath)
      continue
    }

    if (item.id == null) {
      paths.push(...(await listAcademyPdfPaths(fullPath)))
    }
  }

  return paths
}

function matchesModulePdfPath(path: string, pdfName: string, moduleId: number): boolean {
  const base = path.split('/').pop()?.toLowerCase() ?? path.toLowerCase()
  const expected = pdfName.toLowerCase()
  const canonical = resolveEffectivePdfName(pdfName, moduleId).toLowerCase()

  if (base === expected || base === canonical) return true

  const parsedId = parseAcademyModuleIdFromPdfName(base)
  return parsedId === moduleId && base.startsWith(`modulo_${moduleId}_`)
}

async function probeStoragePath(storagePath: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(ACADEMY_STORAGE_BUCKET).download(storagePath)
  if (error || !data) return false
  const buffer = await data.arrayBuffer()
  return hasPdfMagicHeader(buffer)
}

async function resolveAcademyPdfStoragePath(pdfName: string, moduleId: number): Promise<string | null> {
  const key = cacheKey(moduleId, pdfName)
  const cached = pathCache.get(key)
  if (cached) {
    return cached
  }

  const candidates = [...new Set(buildPathCandidates(pdfName, moduleId))]
  for (const candidate of candidates) {
    if (await probeStoragePath(candidate)) {
      pathCache.set(key, candidate)
      return candidate
    }
  }

  const listed = await listAcademyPdfPaths()
  const match = listed.find((p) => matchesModulePdfPath(p, pdfName, moduleId))

  if (match) {
    pathCache.set(key, match)
    return match
  }

  return null
}

export async function getAcademyPdfDownloadUrl(
  pdfName: string,
  moduleId: number
): Promise<string | null> {
  const effectivePdfName = resolveEffectivePdfName(pdfName, moduleId)

  const storagePath = await resolveAcademyPdfStoragePath(effectivePdfName, moduleId)
  if (storagePath) {
    const signed = await signedUrlForPath(storagePath)
    if (signed) return signed
  }

  if (!effectivePdfName.includes('/')) {
    const localHref = await resolveLocalAcademyPdfUrl(effectivePdfName)
    if (localHref) return localHref
  }

  return null
}

export async function uploadAcademyPdf(
  pdfName: string,
  moduleId: number,
  file: File
): Promise<void> {
  if (!isAcademyPdfFile(file)) {
    throw new Error('Solo se permiten archivos PDF (máx. 50 MB).')
  }

  const storagePath = resolveEffectivePdfName(pdfName, moduleId)
  const { error } = await supabase.storage.from(ACADEMY_STORAGE_BUCKET).upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw error

  pathCache.set(cacheKey(moduleId, pdfName), storagePath)
}
