import { FormEvent, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Sparkles, Upload } from 'lucide-react'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isSuperAdminByRole } from '@/features/auth/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAcademyModule, generateAcademyQuizFromPdfText } from '../services/academyModules.service'
import { uploadAcademyPdf } from '@/services/academyStorage.service'
import { extractTextFromPdf } from '../utils/pdfText'
import type { AcademyConcept, QuizQuestion } from '../types/academy.types'

function lines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

function buildConcepts(value: string): AcademyConcept[] {
  return lines(value).map((line) => {
    const [term, ...rest] = line.split(':')
    return {
      term: term.trim(),
      description: rest.join(':').trim() || term.trim(),
    }
  })
}

function safePdfName(title: string, fileName: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Modulo_Academia'
  const suffix = Date.now().toString(36)
  const original = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')
  return `modulos/${base}_${suffix}_${original.endsWith('.pdf') ? original : `${original}.pdf`}`
}

export function AcademyModulesAdminPage() {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [duration, setDuration] = useState('1 hora')
  const [objectives, setObjectives] = useState('')
  const [concepts, setConcepts] = useState('')
  const [steps, setSteps] = useState('')
  const [exercise, setExercise] = useState('')
  const [deliverable, setDeliverable] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [pdfText, setPdfText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canSave = useMemo(
    () => Boolean(title.trim() && subtitle.trim() && pdfFile && quiz.length >= 3),
    [pdfFile, quiz.length, subtitle, title]
  )

  if (!isSuperAdminByRole(profile?.rol)) {
    return <Navigate to={ROUTES.ACADEMIA} replace />
  }

  const handlePdfChange = async (file: File | null) => {
    setPdfFile(file)
    setQuiz([])
    setPdfText('')
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permite subir un PDF por modulo.')
      setPdfFile(null)
      return
    }
    const text = await extractTextFromPdf(file)
    setPdfText(text)
    if (text.length < 500) {
      toast.error('No pude extraer suficiente texto del PDF. Usa un PDF con texto seleccionable.')
    } else {
      toast.success('PDF listo para generar preguntas.')
    }
  }

  const handleGenerateQuiz = async () => {
    if (!pdfText) {
      toast.error('Sube primero un PDF con texto seleccionable.')
      return
    }
    setIsGenerating(true)
    try {
      const generated = await generateAcademyQuizFromPdfText({ title, pdfText, questionCount })
      setQuiz(generated)
      toast.success('Preguntas y respuestas generadas.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el quiz.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!pdfFile || !canSave) {
      toast.error('Completa el modulo, sube un PDF y genera al menos 3 preguntas.')
      return
    }
    setIsSaving(true)
    try {
      const pdfName = safePdfName(title, pdfFile.name)
      const module = await createAcademyModule({
        title,
        subtitle,
        duration,
        pdfName,
        objectives: lines(objectives),
        concepts: buildConcepts(concepts),
        steps: lines(steps),
        exercise,
        deliverable,
        quiz,
      })
      await uploadAcademyPdf(pdfName, module.id, pdfFile)
      toast.success('Modulo creado en Academia.')
      setTitle('')
      setSubtitle('')
      setDuration('1 hora')
      setObjectives('')
      setConcepts('')
      setSteps('')
      setExercise('')
      setDeliverable('')
      setPdfFile(null)
      setQuiz([])
      setPdfText('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el modulo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Super admin</p>
        <h1 className="text-2xl font-semibold tracking-tight">Modulos de Academia</h1>
        <p className="text-sm text-muted-foreground">
          Crea modulos con la misma estructura de la ruta actual: PDF unico, objetivos, conceptos, practica y quiz.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Configuracion del modulo</CardTitle>
            <CardDescription>Estos campos aparecen en la vista de Academia para todos los usuarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duracion</Label>
                <Input id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitulo</Label>
              <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">Objetivos, uno por linea</Label>
              <textarea
                id="objectives"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepts">Conceptos clave, formato Termino: descripcion</Label>
              <textarea
                id="concepts"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={concepts}
                onChange={(e) => setConcepts(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps">Pasos practicos, uno por linea</Label>
              <textarea
                id="steps"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exercise">Ejercicio practico</Label>
                <textarea
                  id="exercise"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverable">Entregable</Label>
                <textarea
                  id="deliverable"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={deliverable}
                  onChange={(e) => setDeliverable(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF y quiz</CardTitle>
              <CardDescription>Se permite un solo PDF por modulo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-center text-sm hover:bg-muted/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{pdfFile ? pdfFile.name : 'Subir PDF'}</span>
                <span className="text-xs text-muted-foreground">Archivo PDF con texto seleccionable.</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => void handlePdfChange(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="space-y-2">
                <Label htmlFor="questionCount">Preguntas a generar</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min={3}
                  max={10}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                />
              </div>

              <Button type="button" variant="secondary" className="w-full" disabled={!pdfText || isGenerating} onClick={handleGenerateQuiz}>
                <Sparkles className="h-4 w-4" />
                {isGenerating ? 'Generando...' : 'Generar preguntas'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preguntas generadas</CardTitle>
              <CardDescription>{quiz.length} preguntas listas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quiz.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sube el PDF y genera el quiz antes de guardar.</p>
              ) : (
                quiz.map((q, index) => (
                  <div key={q.question} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{index + 1}. {q.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Respuesta: {q.options[q.correctIndex]}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={!canSave || isSaving}>
            <FileText className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Crear modulo'}
          </Button>
        </div>
      </form>
    </div>
  )
}
