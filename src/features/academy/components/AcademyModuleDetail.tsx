import { useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, Download } from 'lucide-react'
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
  const handleDownloadPdf = useCallback(async () => {
    const href = `/docs/${module.pdfName}`
    try {
      const res = await fetch(href, { method: 'HEAD' })
      if (!res.ok) {
        toast.error(`El PDF ${module.pdfName} aun no esta disponible.`)
        return
      }
      const a = document.createElement('a')
      a.href = href
      a.download = module.pdfName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      toast.error(`No se pudo descargar ${module.pdfName}.`)
    }
  }, [module.pdfName])

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
        <div>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
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
