import type {
  AcademyProgressRow,
  AcademyProgressState,
  AcademyStepKey,
  LearningModule,
} from '../types/academy.types'

export function createEmptyAcademyProgress(): AcademyProgressState {
  return {
    completedModules: new Set<number>(),
    completedSteps: new Set<string>(),
    passedQuizzes: new Set<number>(),
  }
}

export function cloneAcademyProgress(state: AcademyProgressState): AcademyProgressState {
  return {
    completedModules: new Set(state.completedModules),
    completedSteps: new Set(state.completedSteps),
    passedQuizzes: new Set(state.passedQuizzes),
  }
}

export function academyProgressFromRow(row: AcademyProgressRow | null): AcademyProgressState {
  if (!row) return createEmptyAcademyProgress()
  return {
    completedModules: new Set(row.completed_modules ?? []),
    completedSteps: new Set(row.completed_steps ?? []),
    passedQuizzes: new Set(row.passed_quizzes ?? []),
  }
}

export function academyProgressToRowPayload(state: AcademyProgressState) {
  return {
    completed_modules: [...state.completedModules].sort((a, b) => a - b),
    completed_steps: [...state.completedSteps].sort(),
    passed_quizzes: [...state.passedQuizzes].sort((a, b) => a - b),
  }
}

export function moduleStepKey(moduleId: number, stepIndex: number): AcademyStepKey {
  return `${moduleId}-${stepIndex}`
}

export function moduleExerciseStepKey(moduleId: number): AcademyStepKey {
  return `${moduleId}-exercise`
}

export function isModuleUnlocked(
  moduleId: number,
  passedQuizzes: Set<number>,
  completedModules: Set<number>
): boolean {
  if (moduleId === 1) return true
  const prev = moduleId - 1
  return passedQuizzes.has(prev) || completedModules.has(prev)
}

export function academyGlobalProgressPercent(completedCount: number, totalModules: number): number {
  if (totalModules <= 0) return 0
  return Math.min(100, Math.round((completedCount / totalModules) * 100))
}

export function allQuizAnswersCorrect(module: LearningModule, answers: number[]): boolean {
  return module.quiz.every((q, i) => answers[i] === q.correctIndex)
}
