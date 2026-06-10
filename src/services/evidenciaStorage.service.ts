/**
 * Subida de archivos al bucket evidencias (para comentarios u otros).
 * Devuelve el path para guardar en BD.
 */

import {
  EVIDENCIA_REJECTED_MESSAGE,
  isAcceptedEvidenciaFile,
  resolveEvidenciaContentType,
} from '@/lib/evidenciaFileTypes'
import { supabase } from '@/lib/supabase/client'

const BUCKET = 'evidencias'

export { isAcceptedEvidenciaFile } from '@/lib/evidenciaFileTypes'

export async function uploadEvidenciaFile(
  folder: string,
  file: File
): Promise<{ storage_path: string; file_name: string }> {
  if (!isAcceptedEvidenciaFile(file)) {
    throw new Error(EVIDENCIA_REJECTED_MESSAGE)
  }
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const contentType = resolveEvidenciaContentType(file)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false })
  if (error) throw error
  return { storage_path: path, file_name: file.name }
}

export async function getSignedUrlEvidencia(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  return data.signedUrl
}
