import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import type { AcademyProgressRow, AcademyProgressState, LearningModule, QuizSubmitResult } from '../types/academy.types'
import {
  academyProgressFromRow,
  academyProgressToRowPayload,
  allQuizAnswersCorrect,
  cloneAcademyProgress,
  createEmptyAcademyProgress,
  isModuleUnlocked,
  moduleExerciseStepKey,
  moduleStepKey,
} from '../utils/academyProgress'

const TABLE = 'academy_progress'

export function useAcademyProgress() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<AcademyProgressState>(() => createEmptyAcademyProgress())
  const progressRef = useRef<AcademyProgressState>(progress)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Última vez que el registro de academia se guardó en BD (ISO) o null. */
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const loadProgress = useCallback(async () => {
    if (!user?.id) {
      setProgress(createEmptyAcademyProgress())
      setUpdatedAt(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    const { data, error: readError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (readError) {
      setError(readError.message)
      setProgress(createEmptyAcademyProgress())
      setUpdatedAt(null)
      setIsLoading(false)
      return
    }

    const row = (data ?? null) as AcademyProgressRow | null
    setProgress(academyProgressFromRow(row))
    setUpdatedAt(row?.updated_at ?? null)
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const persistProgress = useCallback(
    async (next: AcademyProgressState) => {
      if (!user?.id) return
      setIsSaving(true)
      const payload = academyProgressToRowPayload(next)
      const { error: upsertError } = await supabase.from(TABLE).upsert(
        {
          user_id: user.id,
          ...payload,
        },
        { onConflict: 'user_id' }
      )
      setIsSaving(false)
      if (upsertError) throw upsertError
      setUpdatedAt(new Date().toISOString())
    },
    [user?.id]
  )

  const updateAndPersist = useCallback(
    async (updater: (prev: AcademyProgressState) => AcademyProgressState): Promise<boolean> => {
      if (!user?.id) {
        toast.error('Debes iniciar sesion para guardar tu progreso.')
        return false
      }
      const previous = progressRef.current
      const next = updater(cloneAcademyProgress(previous))
      progressRef.current = next
      setProgress(next)
      setError(null)
      try {
        await persistProgress(next)
        return true
      } catch (err) {
        progressRef.current = previous
        setProgress(previous)
        const message = err instanceof Error ? err.message : 'No se pudo guardar el progreso.'
        setError(message)
        toast.error('No se pudo guardar el progreso de la academia.')
        return false
      }
    },
    [persistProgress, user?.id]
  )

  const toggleStep = useCallback(
    async (moduleId: number, stepIndex: number | 'exercise') => {
      return updateAndPersist((prev) => {
        const key = stepIndex === 'exercise' ? moduleExerciseStepKey(moduleId) : moduleStepKey(moduleId, stepIndex)
        if (prev.completedSteps.has(key)) prev.completedSteps.delete(key)
        else prev.completedSteps.add(key)
        return prev
      })
    },
    [updateAndPersist]
  )

  const markModuleCompleted = useCallback(
    async (moduleId: number) =>
      updateAndPersist((prev) => {
        prev.completedModules.add(moduleId)
        return prev
      }),
    [updateAndPersist]
  )

  const submitQuiz = useCallback(
    async (module: LearningModule, answers: number[]): Promise<QuizSubmitResult> => {
      const allCorrect = allQuizAnswersCorrect(module, answers)
      if (!allCorrect) {
        const incorrectIndexes = module.quiz
          .map((q, i) => ({ q, i }))
          .filter(({ q, i }) => answers[i] !== q.correctIndex)
          .map(({ i }) => i)
        return { allCorrect: false, incorrectIndexes }
      }

      await updateAndPersist((prev) => {
        prev.passedQuizzes.add(module.id)
        prev.completedModules.add(module.id)
        return prev
      })
      return { allCorrect: true, incorrectIndexes: [] }
    },
    [updateAndPersist]
  )

  const isUnlocked = useCallback(
    (moduleId: number) => isModuleUnlocked(moduleId, progress.passedQuizzes, progress.completedModules),
    [progress.completedModules, progress.passedQuizzes]
  )

  const completedCount = progress.completedModules.size

  return useMemo(
    () => ({
      isLoading,
      isSaving,
      error,
      progress,
      updatedAt,
      completedCount,
      isModuleUnlocked: isUnlocked,
      isModuleCompleted: (moduleId: number) => progress.completedModules.has(moduleId),
      isQuizPassed: (moduleId: number) => progress.passedQuizzes.has(moduleId),
      isStepCompleted: (stepKey: string) => progress.completedSteps.has(stepKey),
      toggleStep,
      markModuleCompleted,
      submitQuiz,
      refetch: loadProgress,
    }),
    [
      completedCount,
      error,
      isLoading,
      isSaving,
      isUnlocked,
      loadProgress,
      markModuleCompleted,
      progress,
      submitQuiz,
      toggleStep,
      updatedAt,
    ]
  )
}
