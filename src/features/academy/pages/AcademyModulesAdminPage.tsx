import { FormEvent, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, FileText, ListChecks, Plus, Trash2, Upload } from 'lucide-react'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { canManageAcademyModulesByRole } from '@/features/auth/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createAcademyModule } from '../services/academyModules.service'
import { uploadAcademyPdf } from '@/services/academyStorage.service'
import type { AcademyConcept, QuizQuestion } from '../types/academy.types'
import { getQuestionCorrectIndexes, isMultipleChoiceQuestion } from '../utils/academyProgress'

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

function createEmptyQuestion(): QuizQuestion {
  return {
    question: '',
    options: ['', '', '', ''],
    type: 'single',
    correctIndex: 0,
    correctIndexes: [0],
  }
}

function isQuestionReady(question: QuizQuestion): boolean {
  const correctIndexes = getQuestionCorrectIndexes(question)
  return Boolean(
    question.question.trim() &&
      question.options.length >= 2 &&
      question.options.every((option) => option.trim()) &&
      correctIndexes.length > 0 &&
      correctIndexes.every((index) => index >= 0 && index < question.options.length)
  )
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
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const readyQuestions = useMemo(() => quiz.filter(isQuestionReady).length, [quiz])
  const isQuizReady = useMemo(() => quiz.length >= 3 && readyQuestions === quiz.length, [quiz.length, readyQuestions])

  const canSave = useMemo(
    () => Boolean(title.trim() && subtitle.trim() && pdfFile && isQuizReady),
    [isQuizReady, pdfFile, subtitle, title]
  )

  if (!canManageAcademyModulesByRole(profile?.rol)) {
    return <Navigate to={ROUTES.ACADEMIA} replace />
  }

  const handlePdfChange = (file: File | null) => {
    if (!file) {
      setPdfFile(null)
      return
    }
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permite subir un PDF por modulo.')
      setPdfFile(null)
      return
    }
    setPdfFile(file)
    toast.success('PDF cargado.')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!pdfFile || !canSave) {
      toast.error('Completa el modulo, sube un PDF y crea al menos 3 preguntas completas.')
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el modulo.')
    } finally {
      setIsSaving(false)
    }
  }

  const addQuestion = () => {
    setQuiz((prev) => [...prev, createEmptyQuestion()])
  }

  const removeQuestion = (questionIndex: number) => {
    setQuiz((prev) => prev.filter((_, index) => index !== questionIndex))
  }

  const updateQuestionText = (questionIndex: number, value: string) => {
    setQuiz((prev) =>
      prev.map((question, index) => (index === questionIndex ? { ...question, question: value } : question))
    )
  }

  const updateOptionText = (questionIndex: number, optionIndex: number, value: string) => {
    setQuiz((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? value : option
              ),
            }
          : question
      )
    )
  }

  const setQuestionType = (questionIndex: number, type: 'single' | 'multiple') => {
    setQuiz((prev) =>
      prev.map((question, index) => {
        if (index !== questionIndex) return question
        const correctIndexes = getQuestionCorrectIndexes(question)
        const firstCorrect = correctIndexes[0] ?? 0
        return type === 'single'
          ? { ...question, type, correctIndex: firstCorrect, correctIndexes: [firstCorrect] }
          : { ...question, type, correctIndex: firstCorrect, correctIndexes: correctIndexes.length ? correctIndexes : [0] }
      })
    )
  }

  const setCorrectOption = (questionIndex: number, correctIndex: number) => {
    setQuiz((prev) =>
      prev.map((question, index) =>
        index === questionIndex ? { ...question, correctIndex, correctIndexes: [correctIndex] } : question
      )
    )
  }

  const toggleCorrectOption = (questionIndex: number, optionIndex: number) => {
    setQuiz((prev) =>
      prev.map((question, index) => {
        if (index !== questionIndex) return question
        const current = getQuestionCorrectIndexes(question)
        const next = current.includes(optionIndex)
          ? current.filter((index) => index !== optionIndex)
          : [...current, optionIndex].sort((a, b) => a - b)
        return { ...question, type: 'multiple', correctIndex: next[0], correctIndexes: next }
      })
    )
  }

  const addOption = (questionIndex: number) => {
    setQuiz((prev) =>
      prev.map((question, index) =>
        index === questionIndex && question.options.length < 6
          ? { ...question, options: [...question.options, ''] }
          : question
      )
    )
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuiz((prev) =>
      prev.map((question, index) => {
        if (index !== questionIndex || question.options.length <= 2) return question
        const options = question.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex)
        const nextCorrectIndexes = getQuestionCorrectIndexes(question)
          .filter((correctIndex) => correctIndex !== optionIndex)
          .map((correctIndex) => (correctIndex > optionIndex ? correctIndex - 1 : correctIndex))
        const fallbackCorrectIndexes = nextCorrectIndexes.length ? nextCorrectIndexes : [0]
        return { ...question, options, correctIndex: fallbackCorrectIndexes[0], correctIndexes: fallbackCorrectIndexes }
      })
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Super admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Modulos de Academia</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Crea modulos con PDF unico, objetivos, conceptos, practica y quiz de opcion unica o multiple.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-64">
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preguntas</p>
            <p className="text-lg font-semibold tabular-nums">{quiz.length}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completas</p>
            <p className={cn('text-lg font-semibold tabular-nums', isQuizReady ? 'text-emerald-600' : 'text-foreground')}>
              {readyQuestions}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuracion del modulo</CardTitle>
            <CardDescription>Estos campos aparecen en la vista de Academia para todos los usuarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Diagnostico del Proceso Actual"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duracion</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ej. 2-3 horas"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitulo</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ej. BPMN AS-IS: Order-to-Cash"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">Objetivos, uno por linea</Label>
              <textarea
                id="objectives"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder={'Entender que es un diagrama BPMN y como leerlo.\nMapear tu proceso actual de principio a fin.\nIdentificar cuellos de botella y puntos de dolor.'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepts">Conceptos clave, formato Termino: descripcion</Label>
              <textarea
                id="concepts"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                value={concepts}
                onChange={(e) => setConcepts(e.target.value)}
                placeholder={
                  'BPMN: Notacion estandar para documentar procesos de negocio.\nSwimlanes: Carriles que representan areas o roles del proceso.'
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps">Pasos practicos, uno por linea</Label>
              <textarea
                id="steps"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={
                  'Lee el BPMN AS-IS completo e imprimelo en formato grande.\nLista al menos 10 puntos de dolor.\nValida hallazgos en reunion de 1 hora con lideres.'
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exercise">Ejercicio practico</Label>
                <textarea
                  id="exercise"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  placeholder="Ej. Taller de validacion del AS-IS con lideres para priorizar 5 problemas criticos."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverable">Entregable</Label>
                <textarea
                  id="deliverable"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                  value={deliverable}
                  onChange={(e) => setDeliverable(e.target.value)}
                  placeholder="Ej. Foto del BPMN con post-its y lista priorizada de problemas."
                />
              </div>
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Preguntas del quiz</CardTitle>
                <CardDescription>
                  Cada pregunta puede ser de opcion unica o de opcion multiple, igual que el quiz del alumno.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                Agregar pregunta
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {quiz.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                  <ListChecks className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Aun no hay preguntas.</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Agrega las preguntas manualmente para construir el quiz del modulo.
                  </p>
                  <Button type="button" variant="secondary" className="mt-4" onClick={addQuestion}>
                    <Plus className="h-4 w-4" />
                    Crear manualmente
                  </Button>
                </div>
              ) : (
                quiz.map((question, questionIndex) => {
                  const questionReady = isQuestionReady(question)
                  const isMultiple = isMultipleChoiceQuestion(question)
                  const correctIndexes = getQuestionCorrectIndexes(question)
                  return (
                    <section
                      key={questionIndex}
                      className={cn(
                        'rounded-lg border bg-background p-4 shadow-sm',
                        questionReady ? 'border-emerald-200' : 'border-border'
                      )}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {questionIndex + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">Pregunta {questionIndex + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {questionReady ? 'Lista para guardar' : 'Completa pregunta, opciones y respuesta'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeQuestion(questionIndex)}
                          aria-label={`Eliminar pregunta ${questionIndex + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quiz-question-${questionIndex}`}>Texto de la pregunta</Label>
                        <textarea
                          id={`quiz-question-${questionIndex}`}
                          className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                          value={question.question}
                          onChange={(e) => updateQuestionText(questionIndex, e.target.value)}
                          placeholder="Ej. Que significa BPMN?"
                        />
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="space-y-2">
                          <Label>Tipo de pregunta</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={!isMultiple ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setQuestionType(questionIndex, 'single')}
                            >
                              Opcion unica
                            </Button>
                            <Button
                              type="button"
                              variant={isMultiple ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setQuestionType(questionIndex, 'multiple')}
                            >
                              Opcion multiple
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <Label>Opciones</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={question.options.length >= 6}
                            onClick={() => addOption(questionIndex)}
                          >
                            <Plus className="h-4 w-4" />
                            Opcion
                          </Button>
                        </div>
                        <div
                          className="space-y-2"
                          role={isMultiple ? 'group' : 'radiogroup'}
                          aria-label={`Respuesta correcta pregunta ${questionIndex + 1}`}
                        >
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2 rounded-md border bg-muted/20 p-2">
                              <input
                                type={isMultiple ? 'checkbox' : 'radio'}
                                name={`academy-admin-q-${questionIndex}`}
                                className="h-4 w-4 shrink-0"
                                checked={correctIndexes.includes(optionIndex)}
                                onChange={() =>
                                  isMultiple
                                    ? toggleCorrectOption(questionIndex, optionIndex)
                                    : setCorrectOption(questionIndex, optionIndex)
                                }
                                aria-label={`Marcar opcion ${optionIndex + 1} como correcta`}
                              />
                              <Input
                                value={option}
                                onChange={(e) => updateOptionText(questionIndex, optionIndex, e.target.value)}
                                placeholder={
                                  optionIndex === 0
                                    ? 'Ej. Business Process Model and Notation'
                                    : optionIndex === 1
                                      ? 'Ej. Las areas o roles participantes'
                                      : `Opcion ${optionIndex + 1}`
                                }
                                className="h-9"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                disabled={question.options.length <= 2}
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                aria-label={`Eliminar opcion ${optionIndex + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isMultiple
                            ? 'Marca todas las respuestas correctas. El alumno debera seleccionar exactamente esas opciones.'
                            : 'Selecciona con el radio button la unica respuesta correcta.'}
                        </p>
                      </div>
                    </section>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF y quiz</CardTitle>
              <CardDescription>Sube el PDF del modulo y crea el quiz en el panel de preguntas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-5 text-center text-sm transition-colors hover:bg-muted/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{pdfFile ? pdfFile.name : 'Subir PDF'}</span>
                <span className="text-xs text-muted-foreground">
                  {pdfFile ? 'Haz clic para reemplazar el archivo' : 'Ej. Modulo_1_Diagnostico.pdf'}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handlePdfChange(e.target.files?.[0] ?? null)}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del quiz</CardTitle>
              <CardDescription>{readyQuestions} de {quiz.length} preguntas completas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quiz.length === 0 ? (
                <p className="text-sm text-muted-foreground">Agrega al menos 3 preguntas antes de guardar.</p>
              ) : (
                quiz.map((q, index) => (
                  <div key={`${q.question}-${index}`} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', isQuestionReady(q) ? 'text-emerald-600' : 'text-muted-foreground')} />
                      <div className="min-w-0">
                        <p className="font-medium">{index + 1}. {q.question || 'Pregunta sin texto'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Respuesta:{' '}
                          {getQuestionCorrectIndexes(q)
                            .map((correctIndex) => q.options[correctIndex])
                            .filter(Boolean)
                            .join(', ') || 'Selecciona y escribe una opcion'}
                        </p>
                      </div>
                    </div>
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
