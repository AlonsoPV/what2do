/**
 * PDFs de Academia O2C en Storage (bucket `academia`).
 * Resuelve la ruta real subida y genera URL firmada para descarga.
 */

import { supabase } from '@/lib/supabase/client'

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

function buildPathCandidates(pdfName: string, moduleId: number): string[] {
  const modulePrefix = `Modulo_${moduleId}`
  return [
    pdfName,
    `modulos/${pdfName}`,
    `pdfs/${pdfName}`,
    `${modulePrefix}/${pdfName}`,
    `modulo-${moduleId}/${pdfName}`,
    `${modulePrefix}.pdf`,
    `modulos/${modulePrefix}.pdf`,
  ]
}

async function signedUrlForPath(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ACADEMY_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

async function listAcademyPdfPaths(): Promise<string[]> {
  const paths: string[] = []

  const { data: rootItems, error: rootError } = await supabase.storage
    .from(ACADEMY_STORAGE_BUCKET)
    .list('', { limit: 200 })

  if (rootError) return paths

  for (const item of rootItems ?? []) {
    if (item.name.toLowerCase().endsWith('.pdf')) {
      paths.push(item.name)
      continue
    }

    const { data: nestedItems, error: nestedError } = await supabase.storage
      .from(ACADEMY_STORAGE_BUCKET)
      .list(item.name, { limit: 200 })

    if (nestedError) continue

    for (const nested of nestedItems ?? []) {
      if (nested.name.toLowerCase().endsWith('.pdf')) {
        paths.push(`${item.name}/${nested.name}`)
      }
    }
  }

  return paths
}

async function resolveAcademyPdfStoragePath(pdfName: string, moduleId: number): Promise<string | null> {
  const key = cacheKey(moduleId, pdfName)
  const cached = pathCache.get(key)
  if (cached) {
    return cached
  }

  const listed = await listAcademyPdfPaths()
  const candidates = new Set(buildPathCandidates(pdfName, moduleId))
  const moduleToken = `modulo_${moduleId}`.toLowerCase()

  const match =
    listed.find((p) => candidates.has(p)) ??
    listed.find((p) => p === pdfName || p.endsWith(`/${pdfName}`)) ??
    listed.find((p) => p.toLowerCase().includes(moduleToken)) ??
    listed.find((p) => p.toLowerCase().includes(`modulo ${moduleId}`.toLowerCase()))

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
  if (!pdfName.includes('/')) {
    try {
      const localHref = `/docs/${encodeURIComponent(pdfName)}`
      const res = await fetch(localHref, { method: 'HEAD' })
      if (res.ok) return localHref
    } catch {
      /* fallback unavailable */
    }
  }

  const storagePath = await resolveAcademyPdfStoragePath(pdfName, moduleId)
  if (storagePath) {
    return signedUrlForPath(storagePath)
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

  const storagePath = pdfName
  const { error } = await supabase.storage.from(ACADEMY_STORAGE_BUCKET).upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw error

  pathCache.set(cacheKey(moduleId, pdfName), storagePath)
}
