export type AcademyStepKey = `${number}-${number}` | `${number}-exercise`

export interface QuizQuestion {
  question: string
  options: string[]
  type?: 'single' | 'multiple'
  correctIndex?: number
  correctIndexes?: number[]
}

export type QuizAnswer = number | number[]

/** Concepto clave con descripción detallada (referencia Academia O2C). */
export interface AcademyConcept {
  term: string
  description: string
}

export interface LearningModule {
  id: number
  title: string
  subtitle: string
  duration: string
  pdfName: string
  objectives: string[]
  concepts: AcademyConcept[]
  steps: string[]
  exercise: string
  deliverable: string
  quiz: QuizQuestion[]
}

export interface AcademyProgressRow {
  id: string
  user_id: string
  completed_modules: number[]
  completed_steps: string[]
  passed_quizzes: number[]
  updated_at: string
}

export interface AcademyProgressState {
  completedModules: Set<number>
  completedSteps: Set<string>
  passedQuizzes: Set<number>
}

export interface QuizSubmitResult {
  allCorrect: boolean
  incorrectIndexes: number[]
}
