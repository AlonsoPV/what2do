/**
 * Sección de carga de evidencias para una acción.
 * Solo en edición; lista existentes y permite subir o eliminar.
 */

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EVIDENCIA_ACCEPTED_FORMATS_LABEL, EVIDENCIA_REJECTED_MESSAGE } from '@/lib/evidenciaFileTypes'
import {
  accionEvidenciasService,
  getAcceptedAccept,
  isAcceptedFile,
} from '@/services/accionEvidencias.service'
import { accionesService } from '@/services/acciones.service'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { Paperclip, FileText, Image, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const EVIDENCIAS_KEY = ['accion_evidencias'] as const

export interface AccionEvidenciasSectionProps {
  accionId: string
  readOnly?: boolean
  onEvidenciaChange?: () => void
}

export function AccionEvidenciasSection({
  accionId,
  readOnly = false,
  onEvidenciaChange,
}: AccionEvidenciasSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const { data: list = [], isLoading } = useQuery({
    queryKey: [...EVIDENCIAS_KEY, accionId],
    queryFn: () => accionEvidenciasService.listByAccion(accionId),
    enabled: !!accionId,
  })
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      accionEvidenciasService.upload(accionId, file, currentUser?.id ?? null),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: [...EVIDENCIAS_KEY, accionId] })
      qc.invalidateQueries({ queryKey: ['acciones'] })
      try {
        await accionesService.update(accionId, { evidencia_cargada: true })
      } catch {
        // No bloquear UX si falla el flag
      }
      onEvidenciaChange?.()
      toast.success('Archivo subido')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al subir'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => accionEvidenciasService.delete(id),
    onSuccess: async () => {
      const wasLast = list.length === 1
      qc.invalidateQueries({ queryKey: [...EVIDENCIAS_KEY, accionId] })
      qc.invalidateQueries({ queryKey: ['acciones'] })
      if (wasLast) {
        try {
          await accionesService.update(accionId, { evidencia_cargada: false })
        } catch {
          // No bloquear UX
        }
      }
      onEvidenciaChange?.()
      toast.success('Archivo eliminado')
    },
    onError: () => toast.error('Error al eliminar'),
  })
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    if (readOnly) {
      toast.error('Solo la persona creadora de la acción puede editar la evidencia.')
      return
    }
    if (!isAcceptedFile(file)) {
      toast.error(EVIDENCIA_REJECTED_MESSAGE)
      return
    }
    uploadMutation.mutate(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (readOnly) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleOpenUrl = async (path: string) => {
    try {
      const url = await accionEvidenciasService.getSignedUrl(path)
      window.open(url, '_blank')
    } catch {
      toast.error('No se pudo abrir el archivo')
    }
  }

  return (
    <Card className="border-border/60 bg-muted/5">
      <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Paperclip className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Evidencia adjunta</h4>
          <p className="text-xs text-muted-foreground">{EVIDENCIA_ACCEPTED_FORMATS_LABEL}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptedAccept()}
          className="hidden"
          onChange={handleInputChange}
          disabled={readOnly}
        />
        {readOnly && (
          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-snug text-muted-foreground">
            Solo la persona creadora de la acción puede editar la evidencia.
          </p>
        )}
        {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors
            ${dragOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20'}
          `}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-4 w-4" />
            )}
            Seleccionar archivo
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            o arrastra un archivo aquí
          </p>
        </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : list.length > 0 ? (
          <ul className="space-y-2">
            {list.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2"
              >
                {ev.content_type?.startsWith('image/') ? (
                  <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <button
                  type="button"
                  onClick={() => handleOpenUrl(ev.storage_path)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-primary hover:underline"
                >
                  {ev.file_name ?? ev.storage_path}
                </button>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(ev.id)}
                    disabled={deleteMutation.isPending}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sin archivos aún</p>
        )}
      </CardContent>
    </Card>
  )
}
