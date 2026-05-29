import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, Download, ExternalLink, FileText, Upload } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isAdminByRole, isSuperAdminByRole } from '@/features/auth/lib/permissions'
import { getAcademyPdfDownloadUrl, uploadAcademyPdf } from '@/services/academyStorage.service'
import { useAcademyPdfUrl } from '../hooks/useAcademyPdfUrl'
import type { LearningModule } from '../types/academy.types'
import { moduleExerciseStepKey, moduleStepKey } from '../utils/academyProgress'

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

const CONCEPTOS_CLAVE_INTRO =
  'Documento de referencia técnico-funcional con la descripción detallada de cada concepto clave utilizado en los módulos de la Academia O2C.'

function ConceptosClaveSection({ module }: { module: LearningModule }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-medium">Conceptos clave</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{CONCEPTOS_CLAVE_INTRO}</p>
      </div>
      <div className="space-y-2 border-t border-border/60 pt-4">
        {module.concepts.map((c, index) => (
          <details
            key={`${module.id}-${index}-${c.term}`}
            className="rounded-lg border border-border/80 bg-muted/20 open:[&_summary_svg]:rotate-180"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-left sm:px-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 text-sm font-semibold text-foreground">
                <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                {c.term}
              </span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
              />
            </summary>
            <div className="border-t border-border/60 px-3 pb-3 pt-2 sm:px-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

interface AcademyModuleDetailProps {
  module: LearningModule
  isLocked: boolean
  isSaving?: boolean
  isStepCompleted: (stepKey: string) => boolean
  onToggleStep: (moduleId: number, stepIndex: number | 'exercise') => void
}

export function AcademyModuleDetail({
  module,
  isLocked,
  isSaving = false,
  isStepCompleted,
  onToggleStep,
}: AcademyModuleDetailProps) {
  const { profile } = useAuth()
  const canUploadPdf = profile ? isAdminByRole(profile.rol) || isSuperAdminByRole(profile.rol) : false
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { url: pdfUrl, loading: pdfLoading, available: pdfAvailable, refresh: refreshPdfUrl } =
    useAcademyPdfUrl({
      moduleId: module.id,
      pdfName: module.pdfName,
      enabled: !isLocked,
    })

  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true)
    try {
      const downloadUrl =
        pdfUrl ?? (await getAcademyPdfDownloadUrl(module.pdfName, module.id))

      if (!downloadUrl) {
        toast.error(`El PDF ${module.pdfName} aún no está disponible.`)
        return
      }

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = module.pdfName
      a.rel = 'noopener'
      if (downloadUrl.startsWith('http')) {
        a.target = '_blank'
      }
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      toast.error(`No se pudo descargar ${module.pdfName}.`)
    } finally {
      setIsDownloading(false)
    }
  }, [module.id, module.pdfName, pdfUrl])

  const handleUploadPdf = useCallback(
    async (file: File) => {
      setIsUploading(true)
      try {
        await uploadAcademyPdf(module.pdfName, module.id, file)
        await refreshPdfUrl()
        toast.success(`PDF actualizado. Todos los usuarios podrán descargar ${module.pdfName}.`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo subir el PDF.')
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [module.id, module.pdfName, refreshPdfUrl]
  )

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">
          Modulo {module.id}: {module.title}
        </CardTitle>
        <CardDescription>{module.subtitle}</CardDescription>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Duracion estimada: {module.duration}</span>
          <span className="hidden sm:inline">•</span>
          <span>PDF: {module.pdfName}</span>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-3 sm:px-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">Material del módulo (PDF)</p>
              {isLocked ? (
                <p className="text-xs text-muted-foreground">
                  Desbloquea el módulo para acceder al PDF.
                </p>
              ) : pdfLoading ? (
                <p className="text-xs text-muted-foreground">Vinculando PDF del módulo…</p>
              ) : pdfAvailable && pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Abrir {module.pdfName}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  PDF no encontrado en Storage. Verifica que el archivo esté en el bucket{' '}
                  <span className="font-medium">academia</span> con nombre{' '}
                  <span className="font-medium">{module.pdfName}</span>.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDownloadPdf()}
            disabled={isLocked || isDownloading || isUploading || (!pdfAvailable && !pdfLoading)}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Descargando…' : 'Descargar PDF'}
          </Button>
          {pdfAvailable && pdfUrl ? (
            <Button type="button" variant="secondary" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Ver PDF
              </a>
            </Button>
          ) : null}
          {canUploadPdf ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUploadPdf(file)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isDownloading || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Subiendo…' : 'Subir PDF'}
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <SectionList title="Objetivos" items={module.objectives} />
        <ConceptosClaveSection module={module} />

        <section className="space-y-3">
          <h3 className="font-medium">Pasos practicos</h3>
          <div className="space-y-2">
            {module.steps.map((step, index) => {
              const key = moduleStepKey(module.id, index)
              const checked = isStepCompleted(key)
              return (
                <label key={key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={checked}
                    disabled={isLocked || isSaving}
                    onChange={() => onToggleStep(module.id, index)}
                  />
                  <span className={checked ? 'text-muted-foreground line-through' : ''}>{step}</span>
                </label>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-medium">Ejercicio practico</h3>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={isStepCompleted(moduleExerciseStepKey(module.id))}
              disabled={isLocked || isSaving}
              onChange={() => onToggleStep(module.id, 'exercise')}
            />
            <span>{module.exercise}</span>
          </label>
          <p className="text-xs text-muted-foreground">Entregable: {module.deliverable}</p>
        </section>
      </CardContent>
    </Card>
  )
}
