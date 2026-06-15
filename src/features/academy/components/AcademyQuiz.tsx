import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LearningModule, QuizAnswer } from '../types/academy.types'
import { isMultipleChoiceQuestion } from '../utils/academyProgress'

interface AcademyQuizProps {
  module: LearningModule
  isLocked: boolean
  isPassed: boolean
  isSaving?: boolean
  onSubmitQuiz: (module: LearningModule, answers: QuizAnswer[]) => Promise<{ allCorrect: boolean; incorrectIndexes: number[] }>
}

export function AcademyQuiz({ module, isLocked, isPassed, isSaving = false, onSubmitQuiz }: AcademyQuizProps) {
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [incorrect, setIncorrect] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () =>
      module.quiz.every((question, index) => {
        const answer = answers[index]
        if (isMultipleChoiceQuestion(question)) return Array.isArray(answer) && answer.length > 0
        return typeof answer === 'number' && answer >= 0
      }),
    [answers, module.quiz]
  )

  const setAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = optionIndex
      return next
    })
  }

  const toggleAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      const current = Array.isArray(next[questionIndex]) ? next[questionIndex] : []
      next[questionIndex] = current.includes(optionIndex)
        ? current.filter((index) => index !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Responde todas las preguntas antes de enviar el quiz.')
      return
    }
    setSubmitting(true)
    const result = await onSubmitQuiz(module, answers)
    setSubmitting(false)

    if (result.allCorrect) {
      setIncorrect([])
      toast.success('Quiz aprobado al 100%. Modulo completado.')
      return
    }

    setIncorrect(result.incorrectIndexes)
    toast.error('No alcanzaste 100%. Puedes reintentar sin limite.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz del modulo</CardTitle>
        <CardDescription>
          Se requiere 100% de aciertos para aprobar. Reintentos ilimitados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {module.quiz.map((q, qIdx) => {
          const isMultiple = isMultipleChoiceQuestion(q)
          return (
            <div key={q.question} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {qIdx + 1}. {q.question}
                </p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {isMultiple ? 'Opcion multiple' : 'Opcion unica'}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {q.options.map((opt, oIdx) => {
                  const multipleAnswer = Array.isArray(answers[qIdx]) ? answers[qIdx] : []
                  return (
                    <label key={opt} className="flex items-start gap-2 text-sm">
                      <input
                        type={isMultiple ? 'checkbox' : 'radio'}
                        name={`academy-q-${module.id}-${qIdx}`}
                        className="mt-0.5"
                        checked={isMultiple ? multipleAnswer.includes(oIdx) : answers[qIdx] === oIdx}
                        disabled={isLocked || isPassed || submitting || isSaving}
                        onChange={() => (isMultiple ? toggleAnswer(qIdx, oIdx) : setAnswer(qIdx, oIdx))}
                      />
                      <span>{opt}</span>
                    </label>
                  )
                })}
              </div>
              {isMultiple ? (
                <p className="mt-2 text-xs text-muted-foreground">Puedes seleccionar mas de una respuesta.</p>
              ) : null}
              {incorrect.includes(qIdx) && (
                <p className="mt-2 text-xs text-destructive">Respuesta incorrecta. Revisa este punto y vuelve a intentar.</p>
              )}
            </div>
          )
        })}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLocked || isPassed || submitting || isSaving || !canSubmit}
          >
            {submitting ? 'Validando...' : isPassed ? 'Aprobado' : 'Enviar quiz'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isLocked || submitting}
            onClick={() => {
              setAnswers([])
              setIncorrect([])
            }}
          >
            Reintentar
          </Button>
          {isPassed && <span className="text-sm text-emerald-600">Quiz aprobado.</span>}
        </div>
      </CardContent>
    </Card>
  )
}
