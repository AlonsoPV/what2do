import { supabase } from '@/lib/supabase/client'
import type { AcademyConcept, LearningModule, QuizQuestion } from '../types/academy.types'

const TABLE = 'academy_modules'

interface AcademyModuleRow {
  id: number
  title: string
  subtitle: string
  duration: string
  pdf_name: string
  objectives: string[] | null
  concepts: AcademyConcept[] | null
  steps: string[] | null
  exercise: string
  deliverable: string
  quiz: QuizQuestion[] | null
  is_active: boolean
}

export type CreateAcademyModuleInput = Omit<LearningModule, 'id'>

function normalizeStringArray(value: string[]): string[] {
  return value.map((item) => item.trim()).filter(Boolean)
}

export function academyModuleFromRow(row: AcademyModuleRow): LearningModule {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    duration: row.duration,
    pdfName: row.pdf_name,
    objectives: row.objectives ?? [],
    concepts: row.concepts ?? [],
    steps: row.steps ?? [],
    exercise: row.exercise,
    deliverable: row.deliverable,
    quiz: row.quiz ?? [],
  }
}

export async function listAcademyModules(): Promise<LearningModule[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true })

  if (error) {
    const code = 'code' in error ? error.code : ''
    const status = 'status' in error ? error.status : undefined
    if (code === 'PGRST205' || status === 404 || /academy_modules/i.test(error.message)) {
      return []
    }
    throw error
  }
  return ((data ?? []) as AcademyModuleRow[]).map(academyModuleFromRow)
}

export async function createAcademyModule(input: CreateAcademyModuleInput): Promise<LearningModule> {
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle.trim(),
    duration: input.duration.trim(),
    pdf_name: input.pdfName.trim(),
    objectives: normalizeStringArray(input.objectives),
    concepts: input.concepts,
    steps: normalizeStringArray(input.steps),
    exercise: input.exercise.trim(),
    deliverable: input.deliverable.trim(),
    quiz: input.quiz,
  }

  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single()
  if (error) throw error
  return academyModuleFromRow(data as AcademyModuleRow)
}

export async function updateAcademyModulePdfName(moduleId: number, pdfName: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ pdf_name: pdfName }).eq('id', moduleId)
  if (error) throw error
}

export async function generateAcademyQuizFromPdfText(params: {
  title: string
  pdfText: string
  questionCount: number
}): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.functions.invoke<{ quiz: QuizQuestion[] }>('academy-generate-quiz', {
    body: params,
  })
  if (error) throw error
  return data?.quiz ?? []
}
