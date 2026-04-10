import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LearningModule } from '../types/academy.types'

interface AcademyQuizProps {
  module: LearningModule
  isLocked: boolean
  isPassed: boolean
  isSaving?: boolean
  onSubmitQuiz: (module: LearningModule, answers: number[]) => Promise<{ allCorrect: boolean; incorrectIndexes: number[] }>
}

export function AcademyQuiz({ module, isLocked, isPassed, isSaving = false, onSubmitQuiz }: AcademyQuizProps) {
  const [answers, setAnswers] = useState<number[]>([])
  const [incorrect, setIncorrect] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => answers.length === module.quiz.length && answers.every((a) => a >= 0),
    [answers, module.quiz.length]
  )

  const setAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = optionIndex
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
        {module.quiz.map((q, qIdx) => (
          <div key={q.question} className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              {qIdx + 1}. {q.question}
            </p>
            <div className="mt-2 space-y-1">
              {q.options.map((opt, oIdx) => (
                <label key={opt} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name={`academy-q-${module.id}-${qIdx}`}
                    className="mt-0.5"
                    checked={answers[qIdx] === oIdx}
                    disabled={isLocked || isPassed || submitting || isSaving}
                    onChange={() => setAnswer(qIdx, oIdx)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {incorrect.includes(qIdx) && (
              <p className="mt-2 text-xs text-destructive">Respuesta incorrecta. Revisa este punto y vuelve a intentar.</p>
            )}
          </div>
        ))}

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
