/**
 * Evidencias adjuntas de una acción (tabla accion_evidencias + storage).
 */

import {
  EVIDENCIA_REJECTED_MESSAGE,
  getEvidenciaAcceptedAccept,
  isAcceptedEvidenciaFile,
  resolveEvidenciaContentType,
} from '@/lib/evidenciaFileTypes'
import { supabase } from '@/lib/supabase/client'

const BUCKET = 'evidencias'
const TABLE = 'accion_evidencias'

export interface AccionEvidencia {
  id: string
  accion_id: string
  storage_path: string
  file_name: string | null
  content_type: string | null
  uploaded_at: string
  uploaded_by: string | null
}

function normalizeEvidenciaError(error: unknown): Error {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '42501'
  ) {
    return new Error(
      'No tienes permiso para modificar la evidencia de esta accion. Solo puede hacerlo la persona creadora.'
    )
  }
  return error instanceof Error ? error : new Error('No se pudo guardar la evidencia.')
}

export const isAcceptedFile = isAcceptedEvidenciaFile
export const getAcceptedAccept = getEvidenciaAcceptedAccept

export const accionEvidenciasService = {
  async listByAccion(accionId: string): Promise<AccionEvidencia[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('accion_id', accionId)
      .order('uploaded_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AccionEvidencia[]
  },

  async upload(
    accionId: string,
    file: File,
    uploadedBy: string | null
  ): Promise<AccionEvidencia> {
    if (!isAcceptedEvidenciaFile(file)) {
      throw new Error(EVIDENCIA_REJECTED_MESSAGE)
    }
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `acciones/${accionId}/${crypto.randomUUID()}.${ext}`
    const contentType = resolveEvidenciaContentType(file)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType, upsert: false })
    if (uploadError) throw normalizeEvidenciaError(uploadError)
    const { data: row, error } = await supabase
      .from(TABLE)
      .insert({
        accion_id: accionId,
        storage_path: path,
        file_name: file.name,
        content_type: contentType,
        uploaded_by: uploadedBy,
      })
      .select()
      .single()
    if (error) throw normalizeEvidenciaError(error)
    return row as AccionEvidencia
  },

  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn)
    if (error) throw error
    return data.signedUrl
  },

  async delete(id: string): Promise<void> {
    const { data: row } = await supabase
      .from(TABLE)
      .select('storage_path')
      .eq('id', id)
      .single()
    if (row?.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([row.storage_path])
      if (storageError) throw normalizeEvidenciaError(storageError)
    }
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw normalizeEvidenciaError(error)
  },
}
